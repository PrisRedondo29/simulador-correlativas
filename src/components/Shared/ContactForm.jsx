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
        <Card shadow="none" className="w-full max-w-2xl border border-[#E2E8F0] dark:border-[#2A3540] bg-white dark:bg-[#161D24] rounded-2xl mx-auto">
            <CardBody className="p-6 sm:p-8">
                <div className="mb-5 space-y-1">
                    <h2 className="text-lg sm:text-xl font-bold text-[#1E293B] dark:text-[#F1F5F9]">Envianos tu consulta</h2>
                    <p className="text-[#64748B] dark:text-[#94A3B8] text-xs sm:text-sm">
                        Completá el formulario para reportar errores o enviarnos sugerencias.
                    </p>
                </div>

                <Form
                    ref={form}
                    onSubmit={onSubmit}
                    className="flex flex-col gap-4 w-full"
                    validationBehavior="native"
                >
                    <Input
                        isRequired
                        name="user_name"
                        label="Nombre"
                        placeholder="Ej. Juan Pérez"
                        labelPlacement="outside"
                        variant="bordered"
                        radius="lg"
                        size="md"
                        classNames={{
                            label: "font-semibold text-xs text-[#334155] dark:text-[#CBD5E1] mb-1",
                            inputWrapper: "bg-[#F8FAFC] dark:bg-[#1E2730] border-[#E2E8F0] dark:border-[#2A3540] hover:border-[#005A36] focus-within:border-[#005A36] shadow-none"
                        }}
                    />

                    <Input
                        isRequired
                        name="user_email"
                        type="email"
                        label="Correo electrónico"
                        placeholder="ejemplo@correo.com"
                        labelPlacement="outside"
                        variant="bordered"
                        radius="lg"
                        size="md"
                        classNames={{
                            label: "font-semibold text-xs text-[#334155] dark:text-[#CBD5E1] mb-1",
                            inputWrapper: "bg-[#F8FAFC] dark:bg-[#1E2730] border-[#E2E8F0] dark:border-[#2A3540] hover:border-[#005A36] focus-within:border-[#005A36] shadow-none"
                        }}
                        errorMessage="Por favor, ingresa un correo electrónico válido."
                    />

                    <Textarea
                        isRequired
                        name="message"
                        label="Mensaje"
                        placeholder="Escribí aquí tu consulta, detalle o sugerencia..."
                        labelPlacement="outside"
                        variant="bordered"
                        radius="lg"
                        size="md"
                        minRows={4}
                        classNames={{
                            label: "font-semibold text-xs text-[#334155] dark:text-[#CBD5E1] mb-1",
                            inputWrapper: "bg-[#F8FAFC] dark:bg-[#1E2730] border-[#E2E8F0] dark:border-[#2A3540] hover:border-[#005A36] focus-within:border-[#005A36] shadow-none"
                        }}
                    />

                    <div className="w-full pt-1 flex flex-col gap-3">
                        <Button
                            type="submit"
                            color="primary"
                            size="md"
                            isLoading={isLoading}
                            className="w-full font-semibold h-11 rounded-xl text-sm bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] text-white"
                            endContent={!isLoading && <i className="fa-solid fa-paper-plane ml-1 text-xs"></i>}
                        >
                            {isLoading ? "Enviando..." : "Enviar mensaje"}
                        </Button>

                        {/* Mensaje de éxito/feedback */}
                        <div className={`transition-all duration-200 ${action ? 'h-auto opacity-100' : 'h-0 opacity-0 overflow-hidden'}`}>
                            {action && (
                                <div className="text-[#166534] dark:text-[#86EFAC] flex items-center justify-center gap-2 font-medium text-sm bg-[#ECFDF5] dark:bg-[#102A20] py-2.5 px-4 rounded-xl border border-[#A7F3D0] dark:border-[#1E4D38]">
                                    <i className="fa-solid fa-circle-check"></i>
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

