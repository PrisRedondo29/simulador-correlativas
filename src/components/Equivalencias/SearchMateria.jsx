import React from 'react';
import { Input } from '@heroui/react';
import { Search } from 'lucide-react';

function SearchMateria({ busqueda, setBusqueda }) {
    return (
        <div className="w-full">
            <Input
                isClearable
                radius="lg"
                placeholder="Buscar materia por nombre o código..."
                startContent={
                    <Search size={17} className="text-[#64748B] pointer-events-none shrink-0" />
                }
                value={busqueda}
                onValueChange={setBusqueda}
                onClear={() => setBusqueda('')}
                classNames={{
                    input: 'text-sm',
                    inputWrapper: 'h-10 bg-[#F8FAFC] dark:bg-[#1E2730] border border-[#E2E8F0] dark:border-[#2A3540] shadow-none focus-within:border-[#005A36]',
                }}
            />
        </div>
    );
}

export default SearchMateria;
