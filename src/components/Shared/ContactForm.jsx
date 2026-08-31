import React, { useState, useRef } from 'react';
import { Button, Input, Textarea, Form, addToast, Card, CardBody } from '@heroui/react';
import emailjs from '@emailjs/browser';
import { useAuth } from '../../context/AuthContext';

const ContactForm = () => {
    const { user } = useAuth();
    const [action, setAction] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const form = useRef();

    const onSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);

        // Recolectar información de diagnóstico simplificada
        const getBrowserInfo = () => {
            const ua = navigator.userAgent;
            if (ua.includes("Edg/")) return "Microsoft Edge";
            if (ua.includes("Chrome/")) return "Google Chrome";
            if (ua.includes("Firefox/")) return "Mozilla Firefox";
            if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
            return "Navegador Desconocido";
        };

        const getPlatformInfo = () => {
            const platform = navigator.platform.toLowerCase();
            if (platform.includes("win")) return "Windows";
            if (platform.includes("mac")) return "macOS";
            if (platform.includes("linux")) return "Linux";
            if (/android|iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase())) return "Mobile";
            return navigator.platform || "Plataforma Desconocida";
        };

        const getLanguageInfo = () => {
            const lang = navigator.language.toLowerCase();
            if (lang.startsWith("es")) return "Español";
            if (lang.startsWith("en")) return "Inglés";
            return navigator.language.toUpperCase();
        };

        const diagnostics = {
            uid: user?.uid || 'Invitado (Sin sesión)',
            browser: getBrowserInfo(),
            platform: getPlatformInfo(),
            resolution: `${window.screen.width}x${window.screen.height}`,
            language: getLanguageInfo(),
            url: window.location.origin + window.location.pathname,
            timestamp: new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })
        };

        // Clonar los datos del formulario para modificar el mensaje sin afectar la UI
        const formData = new FormData(form.current);
        const originalMessage = formData.get('message');
        
        const diagnosticString = `
\n\n--- Información de Diagnóstico ---
• UID: ${diagnostics.uid}
• Navegador: ${diagnostics.browser}
• Plataforma: ${diagnostics.platform}
• Resolución: ${diagnostics.resolution}
• Idioma: ${diagnostics.language}
• URL: ${diagnostics.url}
• Fecha: ${diagnostics.timestamp}
----------------------------------`;

        // EmailJS sendForm usa el elemento real, por lo que para adjuntar info extra
        // sin que el usuario la vea en el campo de texto, podemos usar send()
        // enviando un objeto con los nombres de las variables del template.
        
        const templateParams = {
            user_name: formData.get('user_name'),
            user_email: formData.get('user_email'),
            message: originalMessage + diagnosticString
        };

        emailjs.send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID || import.meta.env.EMAILJS_SERVICE_ID,
            import.meta.env.VITE_EMAILJS_TEMPLATE_ID || import.meta.env.EMAILJS_TEMPLATE_ID,
            templateParams,
            { publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || import.meta.env.EMAILJS_PUBLIC_KEY }
        )
            .then(
                () => {
                    setAction("¡Mensaje enviado con éxito!");
                    form.current.reset();
                    setTimeout(() => setAction(null), 3000);
                },
                (error) => {
                    if (import.meta.env.DEV) console.error('EmailJS Error:', error);
                    addToast({ 
                        title: "Error", 
                        description: "Hubo un problema al enviar el mensaje. Inténtalo de nuevo más tarde.", 
                        color: "danger" 
                    });
                }
            )
            .finally(() => {
                setIsLoading(false);
            });
    };

    return (
        <Card className="w-full max-w-2xl shadow-xs border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl mx-auto">
            <CardBody className="p-6 sm:p-10">
                <div className="mb-6 space-y-1">
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground">Envianos tu consulta</h2>
                    <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm">
                        ¿Necesitás realizar una consulta o comunicarte con el equipo? Podés hacerlo a través de nuestro formulario de contacto.
                    </p>
                </div>

                <Form
                    ref={form}
                    onSubmit={onSubmit}
                    className="flex flex-col gap-5 w-full"
                    validationBehavior="native"
                >
                    <Input
                        isRequired
                        name="user_name"
                        label="TU NOMBRE"
                        placeholder="Ej. Juan Pérez"
                        labelPlacement="outside"
                        variant="bordered"
                        radius="lg"
                        size="md"
                        classNames={{
                            label: "font-bold text-[11px] uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1",
                            inputWrapper: "bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 hover:border-[#005a36] focus-within:border-[#005a36] shadow-none"
                        }}
                    />

                    <Input
                        isRequired
                        name="user_email"
                        type="email"
                        label="TU DIRECCIÓN DE CORREO ELECTRÓNICO"
                        placeholder="ejemplo@correo.com"
                        labelPlacement="outside"
                        variant="bordered"
                        radius="lg"
                        size="md"
                        classNames={{
                            label: "font-bold text-[11px] uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1",
                            inputWrapper: "bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 hover:border-[#005a36] focus-within:border-[#005a36] shadow-none"
                        }}
                        errorMessage="Por favor, ingresa un correo electrónico válido."
                    />

                    <Textarea
                        isRequired
                        name="message"
                        label="MENSAJE"
                        placeholder="Escribí aquí tu consulta, detalle o sugerencia..."
                        labelPlacement="outside"
                        variant="bordered"
                        radius="lg"
                        size="md"
                        minRows={4}
                        classNames={{
                            label: "font-bold text-[11px] uppercase tracking-wider text-slate-700 dark:text-zinc-300 mb-1",
                            inputWrapper: "bg-slate-50 dark:bg-zinc-800/80 border-slate-200 dark:border-zinc-700 hover:border-[#005a36] focus-within:border-[#005a36] shadow-none"
                        }}
                    />

                    <div className="w-full pt-2 flex flex-col gap-4">
                        <Button
                            type="submit"
                            color="primary"
                            size="lg"
                            isLoading={isLoading}
                            className="w-full font-bold shadow-sm h-12 rounded-xl text-sm"
                            endContent={!isLoading && <i className="fa-solid fa-paper-plane ml-2"></i>}
                        >
                            {isLoading ? "Enviando..." : "Enviar mensaje"}
                        </Button>

                        {/* Mensaje de éxito/feedback */}
                        <div className={`transition-all duration-300 ${action ? 'h-auto opacity-100' : 'h-0 opacity-0 overflow-hidden'}`}>
                            {action && (
                                <div className="text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2 font-bold text-sm bg-emerald-50 dark:bg-emerald-950/40 py-3 px-4 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-in zoom-in duration-300">
                                    <i className="fa-solid fa-circle-check text-emerald-600"></i>
                                    {action}
                                </div>
                            )}
                        </div>
                    </div>
                </Form>
            </CardBody>
        </Card>
    );
};

export default ContactForm;

