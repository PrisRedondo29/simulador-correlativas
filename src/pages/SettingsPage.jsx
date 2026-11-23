import React, { useState, useEffect, useRef } from 'react';
import {
    Button,
    Input,
    Card,
    CardHeader,
    CardBody,
    Divider,
    Tabs,
    Tab,
    addToast,
    Chip,
    Avatar,
    Switch,
} from '@heroui/react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlanCapabilities } from '../context/PlanContext';
import { DEFAULT_PLAN } from '../config/planPolicies';
import { updateUserConfig } from '../services/dbService';
import { useTheme } from 'next-themes';
import { trackSeleccionCarrera } from '../services/analyticsService';
import storageRepository, { subscribeStorageChanges } from '../services/storageRepository';
import { getAvailableTours } from '../config/tutorialTours';
import usePwaInstall from '../hooks/usePwaInstall';
import DeleteAccountDialog from '../components/Settings/DeleteAccountDialog';

export default function SettingsPage({ plan, setPlan }) {
    const navigate = useNavigate();
    const {
        user,
        userData,
        loading,
        refetchUserData,
        signIn,
        recoveryBackup,
        restorePreviousBackup,
        exportBackupJson,
        importBackupJson,
        deleteAccount,
        pendingAccountDeletion,
    } = useAuth();
    const {
        tenant,
        career,
        availableCareers,
        catalogCareers,
        can,
        canSimulateTransition,
        transitionInfo,
    } = usePlanCapabilities();
    const availableTours = getAvailableTours(can);
    const { theme, setTheme } = useTheme();
    const activePlan = plan || career?.defaultPlan || DEFAULT_PLAN;
    const activeCareer = career || availableCareers[0] || null;
    const careerPlans = activeCareer?.plans || [];
    const displayCareers =
        Array.isArray(catalogCareers) && catalogCareers.length > 0
            ? catalogCareers
            : availableCareers;

    const [alias, setAlias] = useState('');
    const [saving, setSaving] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [deleteDialogError, setDeleteDialogError] = useState(null);
    const [tutorialPrefs, setTutorialPrefs] = useState(() => storageRepository.getTutorialPrefs());
    const importInputRef = useRef(null);
    const { canInstall, isInstalling, triggerInstall } = usePwaInstall();

    useEffect(() => {
        return subscribeStorageChanges(() => {
            setTutorialPrefs(storageRepository.getTutorialPrefs());
        });
    }, []);

    useEffect(() => {
        if (userData?.config?.alias) {
            setAlias(userData.config.alias);
        } else if (user?.displayName) {
            setAlias(user.displayName.split(' ')[0] || '');
        }
    }, [userData, user]);

    const handleSave = async () => {
        if (!user) {
            try {
                const loggedUser = await signIn();
                if (loggedUser) {
                    addToast({ title: '¡Bienvenido!', description: 'Sesión iniciada correctamente.', color: 'success' });
                }
            } catch {
                addToast({ title: 'Aviso', description: 'No se pudo completar el inicio de sesión.', color: 'warning' });
            }
            return;
        }

        setSaving(true);
        try {
            await updateUserConfig(user.uid, {
                alias,
                planActivo: plan,
                tema: theme,
            });
            await refetchUserData();
            addToast({ title: 'Guardado', description: 'Tus configuraciones han sido actualizadas.', color: 'success' });
        } catch {
            addToast({ title: 'Error', description: 'No se pudo guardar la configuración.', color: 'danger' });
        } finally {
            setSaving(false);
        }
    };

    const handleExport = () => {
        exportBackupJson(activePlan);
        addToast({
            title: 'Respaldo exportado',
            description: 'Se descargó un archivo JSON con todos tus planes, notas y Mi Agenda.',
            color: 'success',
        });
    };

    const handleImportFileChange = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        try {
            const rawText = await file.text();
            const res = importBackupJson(rawText);
            if (!res.ok) {
                addToast({
                    title: 'No se pudo importar',
                    description: res.error || 'El archivo no corresponde a un respaldo válido.',
                    color: 'danger',
                });
                return;
            }
            if (res.planActivo && setPlan) {
                setPlan(res.planActivo);
            }
            addToast({
                title: 'Respaldo importado',
                description: res.backedUp
                    ? 'Se restauraron tus datos y se guardó una copia previa de seguridad.'
                    : 'Se cargaron los datos del archivo JSON correctamente.',
                color: 'success',
            });
        } catch {
            addToast({
                title: 'Error de lectura',
                description: 'No se pudo leer el archivo seleccionado.',
                color: 'danger',
            });
        }
    };

    const handleRestorePreviousBackup = () => {
        const res = restorePreviousBackup();
        if (res.ok) {
            addToast({
                title: 'Copia restaurada',
                description: 'Se recuperó el estado anterior a la última sobrescritura.',
                color: 'success',
            });
        } else {
            addToast({
                title: 'Aviso',
                description: res.message || 'No hay una copia previa disponible.',
                color: 'warning',
            });
        }
    };

    const handleConfirmDeleteAccount = async ({ clearLocalData }) => {
        if (!deleteAccount) return;
        setDeleteDialogError(null);
        setIsDeletingAccount(true);
        try {
            const res = await deleteAccount({ clearLocalData });
            if (res.ok) {
                setIsDeleteDialogOpen(false);
                addToast({
                    title: 'Cuenta eliminada',
                    description: res.localCleared
                        ? 'Se eliminaron tu cuenta en la nube y tus datos locales de este dispositivo.'
                        : 'Se eliminaron tu cuenta y tus datos de la nube. Tu copia local permanece en este navegador.',
                    color: 'success',
                });
                return;
            }
            if (res.status === 'cancelled') {
                addToast({
                    title: 'Eliminación cancelada',
                    description: 'Cerraste la confirmación de Google. No se eliminó ningún dato.',
                    color: 'default',
                });
                return;
            }
            const errMsg =
                res.message ||
                'No se pudo completar la eliminación de la cuenta. Revisá tu conexión e intentá nuevamente.';
            setDeleteDialogError(errMsg);
        } finally {
            setIsDeletingAccount(false);
        }
    };

    if (loading) return null;

    return (
        <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto flex flex-col gap-6 w-full animate-in fade-in duration-300">
            <header className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1E293B] dark:text-[#F1F5F9]">
                    Configuración
                </h1>
                <p className="text-sm text-[#64748B] dark:text-[#94A3B8]">
                    Gestioná tu perfil, plan de estudios activo, apariencia y respaldo local.
                </p>
            </header>

            {!user && (
                <Card shadow="none" className="bg-[#ECFDF5] dark:bg-[#102A20]/80 border border-[#A7F3D0] dark:border-[#1E4D38] rounded-2xl">
                    <CardBody className="flex flex-col md:flex-row items-center gap-4 p-5">
                        <div className="w-11 h-11 rounded-xl bg-white dark:bg-[#161D24] border border-[#A7F3D0] dark:border-[#1E4D38] flex items-center justify-center text-[#005A36] dark:text-[#86EFAC] shrink-0">
                            <i className="fa-solid fa-cloud-arrow-up text-lg" />
                        </div>
                        <div className="flex-1 text-center md:text-left">
                            <h2 className="text-base font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                                Sincronizá tu progreso en la nube
                            </h2>
                            <p className="text-[#475569] dark:text-[#CBD5E1] text-xs sm:text-sm">
                                Iniciá sesión con Google para resguardar tu avance y acceder desde otros dispositivos.
                            </p>
                        </div>
                        <Button
                            color="primary"
                            className="font-semibold px-6 rounded-xl bg-[#005A36] dark:bg-[#2E8B63] text-white"
                            onPress={async () => {
                                const logged = await signIn();
                                if (logged) {
                                    addToast({ title: '¡Bienvenido!', description: 'Sesión iniciada correctamente.', color: 'success' });
                                }
                            }}
                        >
                            Iniciar sesión
                        </Button>
                    </CardBody>
                </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Perfil */}
                <Card shadow="none" className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl">
                    <CardHeader className="flex gap-3 px-5 pt-5 pb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] dark:bg-[#1E2730] flex items-center justify-center text-[#475569] dark:text-[#CBD5E1]">
                            <i className="fa-solid fa-user text-xs" />
                        </div>
                        <div className="flex flex-col">
                            <p className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] leading-none">Perfil de usuario</p>
                            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">Información de tu cuenta</p>
                        </div>
                    </CardHeader>
                    <Divider className="my-2 mx-5 w-auto bg-[#F1F5F9] dark:bg-[#2A3540]" />
                    <CardBody className="px-5 pb-5 pt-2 flex flex-col gap-4">
                        {user && (
                            <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] dark:bg-[#1E2730] rounded-xl border border-[#E2E8F0] dark:border-[#2A3540]">
                                <Avatar
                                    src={user.photoURL}
                                    name={user.displayName}
                                    className="w-10 h-10"
                                    imgProps={{ referrerPolicy: 'no-referrer' }}
                                />
                                <div className="flex flex-col overflow-hidden">
                                    <p className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] truncate">{user.displayName}</p>
                                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] truncate">{user.email}</p>
                                </div>
                            </div>
                        )}

                        <Input
                            label="Alias / Nombre"
                            placeholder={user ? 'Tu nombre público' : 'Iniciá sesión para editar tu alias'}
                            labelPlacement="outside"
                            description="Se muestra en el saludo inicial."
                            value={alias}
                            onValueChange={setAlias}
                            variant="bordered"
                            isDisabled={!user}
                            classNames={{
                                base: !user ? 'opacity-80' : '',
                                label: 'text-xs font-medium text-[#334155] dark:text-[#CBD5E1]',
                                input: 'text-sm text-[#1E293B] dark:text-[#F1F5F9] placeholder:text-[#64748B]',
                                inputWrapper: 'border-[#E2E8F0] dark:border-[#2A3540] bg-[#F8FAFC] dark:bg-[#11171D]',
                                description: 'text-xs text-[#64748B] dark:text-[#94A3B8]',
                            }}
                            startContent={<i className="fa-solid fa-user text-[#64748B] text-xs mr-1" />}
                            endContent={
                                user && (
                                    <Button
                                        size="sm"
                                        color={alias !== (userData?.config?.alias || user.displayName?.split(' ')[0]) ? 'primary' : 'default'}
                                        variant={alias !== (userData?.config?.alias || user.displayName?.split(' ')[0]) ? 'solid' : 'flat'}
                                        className="h-7 font-semibold px-3 text-xs"
                                        onPress={handleSave}
                                        isLoading={saving}
                                    >
                                        Guardar
                                    </Button>
                                )
                            }
                        />

                        <Input
                            label="Correo Electrónico"
                            labelPlacement="outside"
                            value={user?.email || 'Modo visitante (local)'}
                            variant="bordered"
                            isReadOnly
                            classNames={{
                                label: 'text-xs font-medium text-[#334155] dark:text-[#CBD5E1]',
                                input: 'text-sm text-[#475569] dark:text-[#CBD5E1]',
                                inputWrapper: 'border-[#E2E8F0] dark:border-[#2A3540] bg-[#F8FAFC] dark:bg-[#11171D]',
                            }}
                            startContent={<i className="fa-solid fa-envelope text-[#64748B] text-xs mr-1" />}
                        />
                    </CardBody>
                </Card>

                {/* Preferencias Académicas */}
                <Card shadow="none" className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl">
                    <CardHeader className="flex gap-3 px-5 pt-5 pb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] dark:bg-[#102A20] flex items-center justify-center text-[#005A36] dark:text-[#86EFAC]">
                            <i className="fa-solid fa-graduation-cap text-xs" />
                        </div>
                        <div className="flex flex-col">
                            <p className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] leading-none">Preferencias académicas</p>
                            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">Plan de estudios activo</p>
                        </div>
                    </CardHeader>
                    <Divider className="my-2 mx-5 w-auto bg-[#F1F5F9] dark:bg-[#2A3540]" />
                    <CardBody className="px-5 pb-5 pt-2 flex flex-col gap-3.5">
                        {displayCareers.length > 1 ? (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-[#475569] dark:text-[#CBD5E1]">
                                    Carrera ({tenant?.shortName || 'UNLu'})
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {displayCareers.map((item) => {
                                        const isAvailable =
                                            item.available &&
                                            Array.isArray(item.plans) &&
                                            item.plans.length > 0;
                                        const isCurrent = item.id === activeCareer?.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                disabled={!isAvailable}
                                                onClick={() => {
                                                    if (!isAvailable) return;
                                                    const nextPlan = item.defaultPlan || item.plans?.[0]?.planNumero;
                                                    if (nextPlan) {
                                                        setPlan(nextPlan);
                                                        trackSeleccionCarrera({
                                                            plan: nextPlan,
                                                            origen_plan: 'settings_career',
                                                            carrera: item.name,
                                                        });
                                                    }
                                                }}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors inline-flex items-center gap-1.5 ${
                                                    isCurrent
                                                        ? 'border-[#005A36] dark:border-[#4A9D68] bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] cursor-pointer'
                                                        : isAvailable
                                                            ? 'border-[#E2E8F0] dark:border-[#2A3540] bg-[#F8FAFC] dark:bg-[#1E2730] text-[#475569] dark:text-[#CBD5E1] hover:border-[#CBD5E1] cursor-pointer'
                                                            : 'border-[#E2E8F0] dark:border-[#2A3540] bg-[#F8FAFC]/60 dark:bg-[#1E2730]/40 text-[#94A3B8] dark:text-[#64748B] cursor-not-allowed'
                                                }`}
                                            >
                                                <span>{item.name}</span>
                                                {!isAvailable && (
                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-[#E2E8F0]/70 dark:bg-[#24303C] text-[#64748B] dark:text-[#94A3B8]">
                                                        Próximamente
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : activeCareer ? (
                            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540]">
                                <span className="text-xs font-medium text-[#475569] dark:text-[#CBD5E1] truncate">
                                    {activeCareer.name}
                                </span>
                                <span className="text-[11px] font-semibold text-[#005A36] dark:text-[#6EE7B7] shrink-0">
                                    {tenant?.shortName || 'UNLu'}
                                </span>
                            </div>
                        ) : null}

                        <label className="text-xs font-medium text-[#475569] dark:text-[#CBD5E1]">
                            Plan de Estudios Activo
                        </label>
                        <Tabs
                            aria-label="Selección de Plan"
                            variant="bordered"
                            fullWidth
                            selectedKey={activePlan}
                            onSelectionChange={(key) => {
                                const nextKey = String(key);
                                setPlan(nextKey);
                                trackSeleccionCarrera({
                                    plan: nextKey,
                                    origen_plan: 'settings',
                                    carrera: activeCareer?.name || '',
                                });
                            }}
                            classNames={{
                                base: 'w-full',
                                tabList: 'w-full bg-[#F1F5F9] dark:bg-[#1E2730] p-1 border border-[#E2E8F0] dark:border-[#2A3540] rounded-xl',
                                cursor: 'bg-white dark:bg-[#161D24] border border-[#005A36]/40 dark:border-[#4A9D68]/50 shadow-2xs rounded-lg',
                                tab: 'h-9 px-2',
                                tabContent: 'text-[#475569] dark:text-[#94A3B8] group-data-[selected=true]:text-[#005A36] dark:group-data-[selected=true]:text-[#6EE7B7]',
                            }}
                        >
                            {careerPlans.map((planItem) => (
                                <Tab
                                    key={planItem.planNumero}
                                    title={
                                        <div className="flex items-center gap-1.5">
                                            <span className="text-xs sm:text-sm font-semibold">{planItem.label}</span>
                                            {planItem.isDefault && planItem.statusLabel && (
                                                <Chip size="sm" variant="flat" color="primary" className="h-5 px-1.5 text-[10px]">
                                                    {planItem.statusLabel}
                                                </Chip>
                                            )}
                                        </div>
                                    }
                                />
                            ))}
                        </Tabs>
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                            Cambiar el plan actualiza las materias mostradas en Mis Materias y el Simulador.
                            {canSimulateTransition && transitionInfo && (
                                <>
                                    {' '}
                                    <Link to={transitionInfo.route} className="font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline">
                                        Analizar transición ({transitionInfo.shortBadge}) →
                                    </Link>
                                </>
                            )}
                        </p>

                        <div className="pt-2 border-t border-[#F1F5F9] dark:border-[#2A3540] flex items-center justify-between gap-2">
                            <span className="text-xs text-[#64748B] dark:text-[#94A3B8]">
                                ¿Querés volver a usar el asistente rápido de carga inicial?
                            </span>
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={() => storageRepository.resetOnboardingVersion()}
                                className="min-h-9 font-semibold text-xs rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] border border-[#A7F3D0] dark:border-[#1E4D38] shrink-0"
                                startContent={<i className="fa-solid fa-wand-magic-sparkles text-[11px]" aria-hidden="true" />}
                            >
                                Asistente inicial
                            </Button>
                        </div>
                    </CardBody>
                </Card>

                {/* Personalización */}
                <Card shadow="none" className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl">
                    <CardHeader className="flex gap-3 px-5 pt-5 pb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] dark:bg-[#1E2730] flex items-center justify-center text-[#475569] dark:text-[#CBD5E1]">
                            <i className="fa-solid fa-palette text-xs" />
                        </div>
                        <div className="flex flex-col">
                            <p className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] leading-none">Apariencia</p>
                            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">Elegí el modo visual de la interfaz</p>
                        </div>
                    </CardHeader>
                    <Divider className="my-2 mx-5 w-auto bg-[#F1F5F9] dark:bg-[#2A3540]" />
                    <CardBody className="px-5 pb-5 pt-2">
                        <div className="grid grid-cols-2 gap-2.5">
                            {[
                                { id: 'light', label: 'Modo Claro', icon: 'fa-sun', swatch: 'bg-[#F8FAFC]' },
                                { id: 'dark', label: 'Modo Oscuro', icon: 'fa-moon', swatch: 'bg-[#0F1419]' },
                            ].map((t) => {
                                const active = theme === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setTheme(t.id)}
                                        className={`flex items-center gap-2.5 p-3 rounded-xl border transition-colors cursor-pointer ${
                                            active
                                                ? 'border-[#005A36] dark:border-[#4A9D68] bg-[#ECFDF5] dark:bg-[#102A20]'
                                                : 'border-[#E2E8F0] dark:border-[#2A3540] bg-[#F8FAFC] dark:bg-[#1E2730] hover:border-[#CBD5E1]'
                                        }`}
                                    >
                                        <div className={`w-4 h-4 rounded-full ${t.swatch} border border-[#CBD5E1] dark:border-[#3B4958]`} />
                                        <span className={`text-xs font-semibold ${active ? 'text-[#005A36] dark:text-[#86EFAC]' : 'text-[#475569] dark:text-[#CBD5E1]'}`}>
                                            {t.label}
                                        </span>
                                        {active && <i className="fa-solid fa-check ml-auto text-xs text-[#005A36] dark:text-[#86EFAC]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </CardBody>
                </Card>

                {/* Respaldo de datos */}
                <Card shadow="none" className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl">
                    <CardHeader className="flex gap-3 px-5 pt-5 pb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] dark:bg-[#1E2730] flex items-center justify-center text-[#475569] dark:text-[#CBD5E1]">
                            <i className="fa-solid fa-file-export text-xs" />
                        </div>
                        <div className="flex flex-col">
                            <p className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] leading-none">Respaldo local</p>
                            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">Descargá una copia de tu avance</p>
                        </div>
                    </CardHeader>
                    <Divider className="my-2 mx-5 w-auto bg-[#F1F5F9] dark:bg-[#2A3540]" />
                    <CardBody className="px-5 pb-5 pt-2 flex flex-col justify-between gap-3">
                        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed">
                            Exportá o importá un respaldo portable en JSON con todos tus planes, notas, regularidades y Mi Agenda.
                        </p>

                        <label htmlFor="import-backup-json" className="sr-only">
                            Seleccionar archivo JSON de respaldo
                        </label>
                        <input
                            ref={importInputRef}
                            id="import-backup-json"
                            type="file"
                            accept="application/json,.json"
                            tabIndex={-1}
                            className="sr-only"
                            onChange={handleImportFileChange}
                        />

                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                size="sm"
                                variant="flat"
                                onPress={handleExport}
                                className="font-semibold text-xs h-9 rounded-xl bg-[#F1F5F9] dark:bg-[#1E2730] text-[#1E293B] dark:text-[#F1F5F9] border border-[#E2E8F0] dark:border-[#2A3540] px-4"
                                startContent={<i className="fa-solid fa-download text-xs text-[#005A36] dark:text-[#6EE7B7]" aria-hidden="true" />}
                            >
                                Exportar respaldo (JSON)
                            </Button>

                            <Button
                                size="sm"
                                variant="flat"
                                onPress={() => importInputRef.current?.click()}
                                className="font-semibold text-xs h-9 rounded-xl bg-[#F1F5F9] dark:bg-[#1E2730] text-[#1E293B] dark:text-[#F1F5F9] border border-[#E2E8F0] dark:border-[#2A3540] px-4"
                                startContent={<i className="fa-solid fa-upload text-xs text-[#475569] dark:text-[#CBD5E1]" aria-hidden="true" />}
                            >
                                Importar JSON
                            </Button>
                        </div>

                        {recoveryBackup && (
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9] dark:border-[#2A3540]">
                                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                    Copia automática disponible ({new Date(recoveryBackup.savedAt).toLocaleDateString('es-AR')})
                                </span>
                                <button
                                    type="button"
                                    onClick={handleRestorePreviousBackup}
                                    className="text-xs font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline cursor-pointer shrink-0"
                                >
                                    Restaurar copia
                                </button>
                            </div>
                        )}

                        {canInstall && (
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9] dark:border-[#2A3540]">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                                        Aplicación instalable offline
                                    </p>
                                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                        Instalá el simulador como app en tu PC o celular para abrirlo sin conexión.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    aria-disabled={isInstalling ? 'true' : undefined}
                                    onClick={async () => {
                                        if (isInstalling) return;
                                        const res = await triggerInstall();
                                        if (res.outcome === 'accepted') {
                                            addToast({
                                                title: 'Aplicación instalada',
                                                description: 'Ya podés abrir el simulador desde tu escritorio o pantalla de inicio.',
                                                color: 'success',
                                            });
                                        } else if (res.outcome === 'error' || res.outcome === 'unsupported') {
                                            addToast({
                                                title: 'Instalación desde el navegador',
                                                description: 'Podés instalarla desde el ícono de instalar en la barra de direcciones o desde el menú de tu navegador.',
                                                color: 'warning',
                                            });
                                        }
                                    }}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 h-8 rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#6EE7B7] border border-[#A7F3D0] dark:border-[#1E4D38] hover:opacity-90 cursor-pointer shrink-0 aria-disabled:opacity-60"
                                >
                                    <i className="fa-solid fa-download text-[11px]" aria-hidden="true" />
                                    Instalar app
                                </button>
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Guías interactivas */}
                <Card shadow="none" className="md:col-span-2 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl">
                    <CardHeader className="flex gap-3 px-5 pt-5 pb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] dark:bg-[#102A20] flex items-center justify-center text-[#005A36] dark:text-[#6EE7B7]">
                            <Compass size={15} aria-hidden="true" />
                        </div>
                        <div className="flex flex-col">
                            <p className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] leading-none">
                                Guías interactivas
                            </p>
                            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                                Administrá los recorridos guiados por pantalla
                            </p>
                        </div>
                    </CardHeader>
                    <Divider className="my-2 mx-5 w-auto bg-[#F1F5F9] dark:bg-[#2A3540]" />
                    <CardBody className="px-5 pb-5 pt-2 flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[#F8FAFC] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540]">
                            <div className="space-y-0.5">
                                <p className="text-xs font-semibold text-[#1E293B] dark:text-[#F1F5F9]">
                                    Mostrar guías automáticamente al entrar por primera vez
                                </p>
                                <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                    También se vuelven a ofrecer si actualizamos el tutorial de una sección.
                                </p>
                            </div>
                            <Switch
                                size="sm"
                                color="success"
                                aria-label="Mostrar guías automáticamente al entrar por primera vez"
                                isSelected={!tutorialPrefs.autoDisabled}
                                onValueChange={(enabled) => {
                                    storageRepository.setTutorialPrefs({ autoDisabled: !enabled });
                                    setTutorialPrefs(storageRepository.getTutorialPrefs());
                                }}
                            />
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                                {availableTours.map((tour) => (
                                    <Button
                                        key={tour.id}
                                        size="sm"
                                        variant="flat"
                                        className="bg-[#005A36]/10 text-[#005A36] dark:bg-[#2E8B63]/20 dark:text-[#6EE7B7] font-semibold text-xs h-8 rounded-xl"
                                        startContent={<Compass className="w-3.5 h-3.5" aria-hidden="true" />}
                                        onPress={() =>
                                            navigate(tour.route, {
                                                state: { startTour: tour.id },
                                            })
                                        }
                                    >
                                        Recorrido: {tour.title}
                                    </Button>
                                ))}
                            </div>

                            <Button
                                size="sm"
                                variant="bordered"
                                className="border-[#E2E8F0] dark:border-[#2A3540] text-[#475569] dark:text-[#CBD5E1] text-xs h-8 rounded-xl shrink-0"
                                startContent={<RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />}
                                onPress={() => {
                                    storageRepository.resetAllTutorials();
                                    setTutorialPrefs(storageRepository.getTutorialPrefs());
                                    addToast({
                                        title: 'Guías restablecidas',
                                        description:
                                            'Los recorridos volverán a mostrarse automáticamente en cada sección.',
                                        color: 'success',
                                    });
                                }}
                            >
                                Restablecer guías
                            </Button>
                        </div>
                    </CardBody>
                </Card>

                {/* Privacidad, marco legal y eliminación de cuenta */}
                <Card shadow="none" className="md:col-span-2 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl">
                    <CardHeader className="flex gap-3 px-5 pt-5 pb-2">
                        <div className="w-8 h-8 rounded-lg bg-[#ECFDF5] dark:bg-[#102A20] flex items-center justify-center text-[#005A36] dark:text-[#6EE7B7]">
                            <i className="fa-solid fa-scale-balanced text-xs" aria-hidden="true" />
                        </div>
                        <div className="flex flex-col">
                            <p className="text-sm font-semibold text-[#1E293B] dark:text-[#F1F5F9] leading-none">
                                Privacidad, marco legal y eliminación de cuenta
                            </p>
                            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-1">
                                Transparencia sobre el tratamiento de datos (Ley N° 25.326) y control de tu cuenta
                            </p>
                        </div>
                    </CardHeader>
                    <Divider className="my-2 mx-5 w-auto bg-[#F1F5F9] dark:bg-[#2A3540]" />
                    <CardBody className="px-5 pb-5 pt-2 flex flex-col gap-4">
                        {pendingAccountDeletion?.stage === 'firestore_deleted_auth_pending' && (
                            <div
                                role="alert"
                                className="rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-800/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                                <div className="space-y-1 text-xs text-amber-900 dark:text-amber-200">
                                    <p className="font-semibold">
                                        Eliminación incompleta pendiente de finalizar
                                    </p>
                                    <p className="leading-relaxed">
                                        Tus datos en Cloud Firestore ya fueron eliminados, pero falló la baja en Firebase Auth.
                                        {pendingAccountDeletion.lastErrorMessage
                                            ? ` Detalle: ${pendingAccountDeletion.lastErrorMessage}`
                                            : ''}
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    color="warning"
                                    variant="flat"
                                    className="font-semibold text-xs rounded-xl shrink-0"
                                    onPress={() => {
                                        setDeleteDialogError(null);
                                        setIsDeleteDialogOpen(true);
                                    }}
                                >
                                    Reintentar eliminar cuenta
                                </Button>
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed max-w-2xl">
                                Tu avance se guarda por defecto en el dispositivo y el Analítico SAWeb se procesa localmente sin subir archivos ni conservar DNI o legajo.
                            </p>
                            <Link
                                to="/legal"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#F1F5F9] dark:bg-[#1E2730] text-[#005A36] dark:text-[#6EE7B7] border border-[#E2E8F0] dark:border-[#2A3540] hover:underline shrink-0"
                            >
                                <i className="fa-solid fa-file-shield text-[11px]" aria-hidden="true" />
                                Aviso legal y privacidad
                            </Link>
                        </div>

                        {user && (
                            <div className="pt-3 border-t border-[#F1F5F9] dark:border-[#2A3540] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-0.5">
                                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                                        Eliminar cuenta y datos en la nube
                                    </p>
                                    <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8]">
                                        Reautentica tu sesión de Google, borra tu documento de Cloud Firestore y da de baja tu usuario de Firebase Auth.
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    color="danger"
                                    variant="bordered"
                                    className="font-semibold text-xs h-9 rounded-xl shrink-0"
                                    startContent={<i className="fa-solid fa-trash-can text-xs" aria-hidden="true" />}
                                    onPress={() => {
                                        setDeleteDialogError(null);
                                        setIsDeleteDialogOpen(true);
                                    }}
                                >
                                    Eliminar cuenta y datos en la nube
                                </Button>
                            </div>
                        )}
                    </CardBody>
                </Card>
            </div>

            <DeleteAccountDialog
                isOpen={isDeleteDialogOpen}
                onClose={() => {
                    setIsDeleteDialogOpen(false);
                    setDeleteDialogError(null);
                }}
                onConfirm={handleConfirmDeleteAccount}
                onExportBackup={handleExport}
                pendingDeletion={pendingAccountDeletion}
                isDeleting={isDeletingAccount}
                errorMessage={deleteDialogError}
                userEmail={user?.email || null}
            />
        </div>
    );
}
