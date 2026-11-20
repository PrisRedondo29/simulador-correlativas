import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, Select, SelectItem } from '@heroui/react'
import selectUtils from '../../../utils/Simulador/selectUtils.js'
import { DEFAULT_PLAN } from '../../../config/planPolicies'
import { useState, useEffect } from 'react'

function ConfiguracionSimulador({ isOpen, onOpenChange, onClose, setAnio, setCuatri, setPlan, initialPlan }) {

    const [selectedPlan, setSelectedPlan] = useState(null)
    const [confiAnio, setConfiAnio] = useState("2026")
    const [confiCuatri, setConfiCuatri] = useState("1")
    const confiPlan = selectedPlan || initialPlan || DEFAULT_PLAN

    const handleConfigurar = () => {
        setAnio(confiAnio)
        setPlan(confiPlan)
        setCuatri(confiCuatri)
        onClose()
    }

    // Elimina aria-hidden de los popovers de HeroUI mientras el modal está abierto,
    // evitando el warning "Blocked aria-hidden on an element because its descendant retained focus".
    // No se usa inert porque bloquearía los eventos del mouse en el dropdown.
    useEffect(() => {
        if (!isOpen) return

        const observer = new MutationObserver((mutations) => {
            mutations.forEach(({ target, attributeName }) => {
                if (
                    attributeName === 'aria-hidden' &&
                    target instanceof Element &&
                    target.getAttribute('data-slot') === 'popover' &&
                    target.getAttribute('aria-hidden') === 'true'
                ) {
                    target.removeAttribute('aria-hidden')
                }
            })
        })

        observer.observe(document.body, {
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-hidden'],
        })

        return () => observer.disconnect()
    }, [isOpen])

    return (
        <Modal
            isOpen={isOpen}
            onOpenChange={onOpenChange}
            placement="bottom-center"
            size="md"
            disableAnimation
            scrollBehavior="inside"
            backdrop="blur"
            classNames={{
                base: "sm:rounded-3xl rounded-t-3xl border-0 shadow-2xl max-h-[90vh]",
                header: "border-b border-default-100 p-4 sm:p-6",
                body: "p-3 sm:p-6 gap-4 sm:gap-6",
                footer: "border-t border-default-100 p-4 sm:p-6",
                closeButton: "hover:bg-default-100 active:bg-default-200 transition-colors",
            }}
        >
            <ModalContent>
                {(onClose) => (
                    <>
                        <ModalHeader className='flex flex-col gap-1'>
                            <div className='flex items-center gap-3'>
                                <div className='bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] w-10 h-10 rounded-xl flex items-center justify-center'>
                                    <i className='fa-solid fa-sliders text-base' />
                                </div>
                                <div className='flex flex-col'>
                                    <h2 className='text-lg font-bold text-foreground'>
                                        Configurar Simulación
                                    </h2>
                                    <p className='text-xs font-medium text-foreground/60'>
                                        Parámetros iniciales
                                    </p>
                                </div>
                            </div>
                        </ModalHeader>

                        <ModalBody>
                            {/* Sección: Plan */}
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2 text-foreground">
                                    <div className="w-1 h-5 bg-primary rounded-full"></div>
                                    <h3 className="font-bold text-md">Plan</h3>
                                </div>

                                    <Select
                                        label="Plan de estudio"
                                        aria-label="Seleccionar Plan de estudio"
                                        variant="flat"
                                        selectedKeys={[confiPlan]}
                                        onSelectionChange={(keys) => setSelectedPlan(Array.from(keys)[0])}
                                        classNames={{
                                        trigger: "bg-default-50 border border-default-100 rounded-2xl shadow-sm h-14",
                                        label: "text-foreground/80 font-medium"
                                    }}
                                >
                                    {selectUtils.plans.map((plan) => (
                                        <SelectItem key={plan.key} textValue={plan.label}>
                                            {plan.label}
                                        </SelectItem>
                                    ))}
                                </Select>

                                <div className="flex items-center gap-2 text-foreground">
                                    <div className="w-1 h-5 bg-primary rounded-full"></div>
                                    <h3 className="font-bold text-md">Fecha de Inicio</h3>
                                </div>

                                <div className='flex flex-col sm:flex-row gap-3'>
                                    <Select
                                        label="Año de inicio"
                                        aria-label="Año de inicio de la simulación"
                                        variant="flat"
                                        defaultSelectedKeys={["2026"]}
                                        onSelectionChange={(keys) => setConfiAnio(Array.from(keys)[0])}
                                        classNames={{
                                            trigger: "bg-default-50 border border-default-100 rounded-2xl shadow-sm h-14",
                                            label: "text-foreground/80 font-medium"
                                        }}
                                    >
                                        {selectUtils.anios.map((anio) => (
                                            <SelectItem key={anio.key} textValue={anio.label}>
                                                {anio.label}
                                            </SelectItem>
                                        ))}
                                    </Select>

                                    <Select
                                        label="Cuatrimestre"
                                        aria-label="Cuatrimestre de inicio"
                                        variant="flat"
                                        defaultSelectedKeys={["1"]}
                                        onSelectionChange={(keys) => setConfiCuatri(Array.from(keys)[0])}
                                        classNames={{
                                            trigger: "bg-default-50 border border-default-100 rounded-2xl shadow-sm h-14",
                                            label: "text-foreground/80 font-medium"
                                        }}
                                    >
                                        {selectUtils.cuatris.map((cuatri) => (
                                            <SelectItem key={cuatri.key} textValue={cuatri.label}>
                                                {cuatri.label}
                                            </SelectItem>
                                        ))}
                                    </Select>
                                </div>
                            </div>
                        </ModalBody>

                        <ModalFooter className="flex-col sm:flex-row gap-2.5">
                            <Button
                                color="primary"
                                className="w-full sm:w-auto rounded-xl font-semibold h-10"
                                onPress={() => handleConfigurar()}
                            >
                                Comenzar Simulación
                            </Button>
                            <Button
                                variant="light"
                                onPress={onClose}
                                className="w-full sm:w-auto rounded-xl font-medium h-10 text-foreground/70"
                            >
                                Cancelar
                            </Button>
                        </ModalFooter>
                    </>
                )}
            </ModalContent>
        </Modal>
    )
}

export default ConfiguracionSimulador