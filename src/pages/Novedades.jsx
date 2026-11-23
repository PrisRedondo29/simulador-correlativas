import React from 'react';
import { Button, Card, CardBody, Chip } from '@heroui/react';
import { useNavigate } from 'react-router-dom';
import { CURRENT_RELEASE_VERSION, RELEASES } from '../config/releaseNotes';

/**
 * Página permanente `/novedades` con el historial versionado de actualizaciones.
 * Consume exactamente la misma fuente declarativa que WhatsNewModal.
 */
export default function Novedades() {
    const navigate = useNavigate();

    return (
        <article className="max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 animate-in fade-in duration-300">
            <header className="space-y-2 border-b border-[#E2E8F0] dark:border-[#2A3540] pb-5">
                <div className="flex items-center gap-2 flex-wrap">
                    <Chip
                        size="sm"
                        variant="flat"
                        className="bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#6EE7B7] font-semibold text-xs"
                    >
                        Versión actual {CURRENT_RELEASE_VERSION}
                    </Chip>
                    <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8]">
                        Historial de actualizaciones
                    </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-[#1E293B] dark:text-[#F1F5F9] tracking-tight">
                    Novedades de Mi Avance Académico UNLu
                </h1>
                <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8] max-w-3xl leading-relaxed">
                    Consultá todas las herramientas incorporadas y mejoradas en cada versión, con acceso directo para probarlas.
                </p>
            </header>

            <div className="space-y-10">
                {RELEASES.map((release) => (
                    <section key={release.version} className="space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl p-4 sm:p-5">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#005A36] dark:bg-[#2E8B63] text-white">
                                        v{release.version}
                                    </span>
                                    <h2 className="text-lg font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                                        {release.title}
                                    </h2>
                                </div>
                                <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8]">
                                    {release.summary}
                                </p>
                            </div>
                            <span className="text-xs font-medium text-[#64748B] dark:text-[#94A3B8] shrink-0">
                                {release.date}
                            </span>
                        </div>

                        <div className="space-y-6">
                            {release.sections.map((section) => (
                                <div key={section.group} className="space-y-3">
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#475569] dark:text-[#94A3B8] px-1">
                                        {section.group}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {section.items.map((item) => (
                                            <Card
                                                key={item.id}
                                                shadow="none"
                                                className="bg-white dark:bg-[#161D24] border border-[#E2E8F0] dark:border-[#2A3540] rounded-2xl"
                                            >
                                                <CardBody className="p-4 sm:p-5 flex flex-col justify-between gap-4">
                                                    <div className="space-y-2">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-8 h-8 rounded-xl bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#6EE7B7] border border-[#A7F3D0] dark:border-[#1E4D38] flex items-center justify-center shrink-0">
                                                                    <i className={`fa-solid ${item.icon} text-xs`} aria-hidden="true" />
                                                                </span>
                                                                <h4 className="text-sm font-bold text-[#1E293B] dark:text-[#F1F5F9]">
                                                                    {item.title}
                                                                </h4>
                                                            </div>
                                                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#ECFDF5] dark:bg-[#102A20] text-[#005A36] dark:text-[#86EFAC] shrink-0">
                                                                {item.badge}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                                                            {item.description}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <Button
                                                            size="sm"
                                                            variant="flat"
                                                            onPress={() => navigate(item.route)}
                                                            className="rounded-xl text-xs font-semibold bg-[#F1F5F9] dark:bg-[#1E2730] text-[#005A36] dark:text-[#6EE7B7] border border-[#E2E8F0] dark:border-[#2A3540]"
                                                        >
                                                            {item.ctaLabel}
                                                        </Button>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        </article>
    );
}
