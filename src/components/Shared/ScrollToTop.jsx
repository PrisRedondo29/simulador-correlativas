import React, { useState, useEffect } from 'react';
import { Button } from '@heroui/react';

function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    // Muestra el botón cuando el scroll baja más de 300px
    const toggleVisibility = () => {
        if (window.scrollY > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    useEffect(() => {
        window.addEventListener("scroll", toggleVisibility, { passive: true });
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    // Si estás a menos de 300px desde arriba, no se renderiza (esconde)
    if (!isVisible) return null;

    return (
        <div className="fixed bottom-5 right-5 z-40 animate-in fade-in duration-200">
            <Button 
                isIconOnly 
                color="primary" 
                variant="solid" 
                size="md" 
                className="rounded-full shadow-md size-11 bg-[#005A36] dark:bg-[#2E8B63] text-white border border-white/15"
                onPress={scrollToTop}
                aria-label="Volver arriba"
                data-html2canvas-ignore // Muy importante para que no salga bugueado en el PDF
            >
                <i className="fa-solid fa-arrow-up text-sm"></i>
            </Button>
        </div>
    );
}

export default ScrollToTop;
