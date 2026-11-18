import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@heroui/react';

export default function FeatureGuideCard({
    icon,
    title,
    subtitle,
    accentColor = 'emerald',
    features = [],
    proTip = null,
    navigateTo,
    ctaLabel = 'Ir a la herramienta',
    badge = null,
    defaultOpen = false,
    children = null,
}) {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const colorMap = {
        emerald: {
            bg: 'bg-[#ECFDF5] dark:bg-[#102A20]',
            text: 'text-[#005A36] dark:text-[#86EFAC]',
            border: 'border-[#A7F3D0] dark:border-[#1E4D38]',
            tipBg: 'bg-[#F0FDF4] dark:bg-[#102A20]',
            tipBorder: 'border-[#D1FAE5] dark:border-[#1E4D38]',
            btn: 'bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] text-white',
        },
        amber: {
            bg: 'bg-[#FEF3C7] dark:bg-[#2D2210]',
            text: 'text-[#92400E] dark:text-[#FCD34D]',
            border: 'border-[#FDE68A] dark:border-[#5C4318]',
            tipBg: 'bg-[#FFFBEB] dark:bg-[#2D2210]',
            tipBorder: 'border-[#FDE68A] dark:border-[#5C4318]',
            btn: 'bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] text-white',
        },
        neutral: {
            bg: 'bg-[#F1F5F9] dark:bg-[#1E2730]',
            text: 'text-[#334155] dark:text-[#CBD5E1]',
            border: 'border-[#CBD5E1] dark:border-[#3B4958]',
            tipBg: 'bg-[#F8FAFC] dark:bg-[#1E2730]',
            tipBorder: 'border-[#E2E8F0] dark:border-[#2A3540]',
            btn: 'bg-[#005A36] hover:bg-[#00472B] dark:bg-[#2E8B63] text-white',
        },
    };

    const c = colorMap[accentColor] || colorMap.emerald;

    return (
        <div
            className={`rounded-2xl border ${isOpen ? c.border : 'border-[#E2E8F0] dark:border-[#2A3540]'} bg-white dark:bg-[#161D24] overflow-hidden transition-colors`}
        >
            <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3.5 p-4 sm:p-5 text-left transition-colors hover:bg-[#F8FAFC] dark:hover:bg-[#1E2730] cursor-pointer"
            >
                <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                    <i className={`fa-solid ${icon} text-base ${c.text}`} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-[#1E293B] dark:text-[#F1F5F9]">{title}</h3>
                        {badge && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] dark:bg-[#2D2210] dark:text-[#FCD34D] dark:border-[#5C4318]">
                                {badge}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">{subtitle}</p>
                </div>
                <div className={`w-8 h-8 rounded-lg ${isOpen ? c.bg : 'bg-[#F1F5F9] dark:bg-[#1E2730]'} flex items-center justify-center transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <i className={`fa-solid fa-chevron-down text-xs ${isOpen ? c.text : 'text-[#64748B]'}`} aria-hidden="true" />
                </div>
            </button>

            <div className={`grid transition-all duration-200 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="px-5 pb-5 pt-1 space-y-4">
                        {children && <div>{children}</div>}

                        <ul className="space-y-2">
                            {features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1]">
                                    <i className={`fa-solid fa-circle-check text-xs mt-1 shrink-0 ${c.text}`} aria-hidden="true" />
                                    <span className="leading-relaxed">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        {proTip && (
                            <div className={`p-3.5 rounded-xl ${c.tipBg} border ${c.tipBorder}`}>
                                <div className="flex items-center gap-1.5 mb-1">
                                    <i className={`fa-solid fa-lightbulb text-xs ${c.text}`} aria-hidden="true" />
                                    <span className={`text-xs font-semibold ${c.text}`}>
                                        {proTip.title || 'Consejo'}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-[#475569] dark:text-[#CBD5E1] leading-relaxed">
                                    {proTip.description}
                                </p>
                            </div>
                        )}

                        {navigateTo && (
                            <div>
                                <Button
                                    size="sm"
                                    onPress={() => navigate(navigateTo)}
                                    className={`font-semibold text-xs px-4 h-9 rounded-xl ${c.btn} w-full sm:w-auto`}
                                    endContent={<i className="fa-solid fa-arrow-right text-[10px]" />}
                                >
                                    {ctaLabel}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
