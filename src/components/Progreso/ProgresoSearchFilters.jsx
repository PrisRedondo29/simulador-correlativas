import React from 'react'
import { Input, Button, Badge, Popover, PopoverTrigger, PopoverContent, Checkbox, Chip } from '@heroui/react'
import { Search, ListFilter } from 'lucide-react'
import materiasUtils from '../../utils/Progreso/materiasUtils'

function ProgresoSearchFilters({ busqueda, setBusqueda, filtros, setFiltros }) {
    const searchInputRef = React.useRef(null);
    const estados = materiasUtils.estadosPosibles.concat(['Bloqueado', 'Cursando']);

    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey && e.key.toLowerCase() === 'k') || (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA')) {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    
    const handleToggleFiltro = (estado) => {
        setFiltros(prev => prev.includes(estado) ? prev.filter(f => f !== estado) : [...prev, estado]);
    };

    const clearFiltros = () => setFiltros([]);

    return (
        <div className="flex flex-col gap-3 mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center gap-2">
                {/* Buscador */}
                <div className="flex-1">
                    <Input
                        ref={searchInputRef}
                        isClearable
                        radius="xl"
                        placeholder="Buscar materia... (Ctrl+K)"
                        startContent={<Search size={18} className="text-default-400" />}
                        endContent={
                            <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-default-400 bg-default-100 border border-default-200 rounded-md">
                                <span className="text-xs">⌘</span>K
                            </kbd>
                        }
                        value={busqueda}
                        onValueChange={setBusqueda}
                        onClear={() => setBusqueda("")}
                        classNames={{
                            input: "text-small",
                            inputWrapper: "h-11 bg-background border-default-200 shadow-sm hover:border-default-300 focus-within:ring-2 ring-primary/20 transition-all",
                        }}
                    />
                </div>

                {/* Botón de Filtros */}
                <Badge 
                    content={filtros.length} 
                    color="primary" 
                    isInvisible={filtros.length === 0}
                    shape="circle"
                    className="font-bold"
                >
                    <Popover placement="bottom-end" shadow="lg" showArrow offset={10}>
                        <PopoverTrigger>
                            <Button 
                                isIconOnly 
                                radius="full" 
                                variant="flat" 
                                className={`h-11 w-11 ${filtros.length > 0 ? 'bg-primary/10 text-primary' : 'bg-background border-default-200 text-default-500 border'}`}
                            >
                                <ListFilter size={20} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[280px] p-4">
                            <div className="flex flex-col gap-4 w-full">
                                <div className="flex items-center justify-between border-b border-default-100 pb-2">
                                    <span className="text-sm font-black uppercase tracking-wider">Filtrar por estado</span>
                                    {filtros.length > 0 && (
                                        <Button size="sm" variant="light" color="danger" className="h-7 px-2 font-bold min-w-unit-0" onPress={clearFiltros}>
                                            Limpiar
                                        </Button>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 gap-1">
                                    {/* Opción especial: Falta Información */}
                                    {(() => {
                                        const isFaltaInfoSelected = filtros.includes('falta_info');
                                        return (
                                            <div 
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => {
                                                    if (e.target.tagName !== 'INPUT') {
                                                        handleToggleFiltro('falta_info');
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        handleToggleFiltro('falta_info');
                                                    }
                                                }}
                                                className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors border mb-1 ${isFaltaInfoSelected ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300' : 'hover:bg-default-50 border-transparent'}`}
                                            >
                                                <div className={`size-8 rounded-lg flex items-center justify-center bg-amber-500/20 text-amber-600 dark:text-amber-400`}>
                                                    <i className="fa-solid fa-triangle-exclamation text-sm"></i>
                                                </div>
                                                <span className="text-sm font-bold flex-1">
                                                    Falta Información
                                                </span>
                                                <Checkbox 
                                                    isSelected={isFaltaInfoSelected} 
                                                    size="sm"
                                                    onChange={() => handleToggleFiltro('falta_info')}
                                                    classNames={{ wrapper: "rounded-md" }}
                                                />
                                            </div>
                                        );
                                    })()}

                                    {estados.map((estado) => {
                                        const estilo = materiasUtils.obtenerEstiloPorEstado(estado);
                                        const isSelected = filtros.includes(estado);
                                        
                                        return (
                                            <div 
                                                key={estado}
                                                role="button"
                                                tabIndex={0}
                                                onClick={(e) => {
                                                    if (e.target.tagName !== 'INPUT') {
                                                        handleToggleFiltro(estado);
                                                    }
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        handleToggleFiltro(estado);
                                                    }
                                                }}
                                                className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-default-100' : 'hover:bg-default-50'}`}
                                            >
                                                <div className={`size-8 rounded-lg flex items-center justify-center bg-background border border-default-200 ${isSelected ? estilo.colorText : 'text-default-300'}`}>
                                                    <i className={`fa-solid ${estilo.icon} text-sm`}></i>
                                                </div>
                                                <span className={`text-sm font-bold flex-1 ${isSelected ? 'text-foreground' : 'text-default-500'}`}>
                                                    {estado}
                                                </span>
                                                <Checkbox 
                                                    isSelected={isSelected} 
                                                    size="sm"
                                                    onChange={() => handleToggleFiltro(estado)}
                                                    classNames={{ wrapper: "rounded-md" }}
                                                />
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                </Badge>
            </div>

            {/* Chips de filtros activos */}
            {filtros.length > 0 && (
                <div className="flex flex-wrap gap-2 animate-in fade-in duration-300">
                    {filtros.map(f => {
                        const isSpecial = f === 'falta_info';
                        const label = isSpecial ? 'Falta Información' : f;
                        const chipColor = isSpecial ? 'warning' : materiasUtils.obtenerEstiloPorEstado(f).accent;

                        return (
                            <Chip
                                key={f}
                                size="sm"
                                variant="flat"
                                color={chipColor}
                                onClose={() => handleToggleFiltro(f)}
                                classNames={{
                                    base: "h-7 border border-default-200",
                                    content: "font-bold text-[10px] uppercase"
                                }}
                            >
                                {label}
                            </Chip>
                        );
                    })}
                    {filtros.length > 1 && (
                        <Button 
                            size="sm" 
                            variant="light" 
                            className="h-7 px-2 text-[10px] font-black uppercase text-danger"
                            onPress={clearFiltros}
                        >
                            Limpiar todo
                        </Button>
                    )}
                </div>
            )}
        </div>
    )
}

export default ProgresoSearchFilters
