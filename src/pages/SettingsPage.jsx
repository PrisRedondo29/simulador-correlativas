import React, { useState, useEffect } from 'react';
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
} from '@heroui/react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePlanCapabilities } from '../context/PlanContext';
import { DEFAULT_PLAN } from '../config/planPolicies';
import { updateUserConfig } from '../services/dbService';
import { useTheme } from 'next-themes';
import { trackSeleccionCarrera } from '../services/analyticsService';

export default function SettingsPage({ plan, setPlan }) {
    const {
        user,
        userData,
        loading,
        getProgresoLocal,
        refetchUserData,
        signIn,
    } = useAuth();
    const {
        career,
        availableCareers,
        canSimulateTransition,
        transitionInfo,
    } = usePlanCapabilities();
    const { theme, setTheme } = useTheme();
    const activePlan = plan || career?.defaultPlan || DEFAULT_PLAN;
    const activeCareer = career || availableCareers[0] || null;
    const careerPlans = activeCareer?.plans || [];

    const [alias, setAlias] = useState('');
    const [saving, setSaving] = useState(false);

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
        const exportPlan = activePlan;
        const rawProgreso = getProgresoLocal(exportPlan);

        const minifyProgreso = (prog) => Object.fromEntries(
            Object.entries(prog || {}).filter(([, state]) =>
                ['Aprobado', 'Regular', 'Cursado', 'Promocionado'].includes(state)
            )
        );

        const fullData = {
            plan: exportPlan,
            timestamp: new Date().toISOString(),
            progreso: minifyProgreso(rawProgreso),
        };

        const blob = new Blob([JSON.stringify(fullData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `progreso_unlu_${exportPlan}.json`;
        a.click();
        URL.revokeObjectURL(url);
        addToast({ title: 'Exportado', description: `Se descargó el respaldo del Plan ${exportPlan}.`, color: 'success' });
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
                        {availableCareers.length > 1 ? (
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-medium text-[#475569] dark:text-[#CBD5E1]">
                                    Carrera
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {availableCareers.map((item) => {
                                        const isCurrent = item.id === activeCareer?.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                    const nextPlan = item.defaultPlan || item.plans?.[0]?.planNumero;
                                                    if (nextPlan) {
                                                        setPlan(nextPlan);
                                                        trackSeleccionCarrera({ plan: nextPlan, origen_plan: 'settings_career' });
                                                    }
                                                }}
                                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                                                    isCurrent
                                                        ? 'border-[#005A36] dark:border-[#4A9D68] bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC]'
                                                        : 'border-[#E2E8F0] dark:border-[#2A3540] bg-[#F8FAFC] dark:bg-[#1E2730] text-[#475569] dark:text-[#CBD5E1] hover:border-[#CBD5E1]'
                                                }`}
                                            >
                                                {item.name}
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
                                    UNLu
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
                                trackSeleccionCarrera({ plan: nextKey, origen_plan: 'settings' });
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
                            Cambiar el plan actualiza las materias mostradas en Mi Progreso y el Simulador.
                            {canSimulateTransition && transitionInfo && (
                                <>
                                    {' '}
                                    <Link to={transitionInfo.route} className="font-semibold text-[#005A36] dark:text-[#6EE7B7] hover:underline">
                                        Analizar transición ({transitionInfo.shortBadge}) →
                                    </Link>
                                </>
                            )}
                        </p>
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
                            Exportá un archivo JSON con las materias aprobadas, regulares y en curso registradas en el Plan {activePlan}.
                        </p>
                        <Button
                            size="sm"
                            variant="flat"
                            onPress={handleExport}
                            className="font-semibold text-xs h-9 rounded-xl bg-[#F1F5F9] dark:bg-[#1E2730] text-[#1E293B] dark:text-[#F1F5F9] border border-[#E2E8F0] dark:border-[#2A3540] self-start px-4"
                            startContent={<i className="fa-solid fa-download text-xs text-[#005A36] dark:text-[#6EE7B7]" />}
                        >
                            Exportar avance (JSON)
                        </Button>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
