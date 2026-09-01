import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@heroui/react'

/**
 * Card expandible que muestra las features de cada herramienta.
 * Props:
 *  - icon: FontAwesome class (e.g. "fa-chart-line")
 *  - title: string
 *  - subtitle: string corto
 *  - accentColor: tailwind color class base (e.g. "emerald", "amber")
 *  - features: array of strings (checklist items)
 *  - proTip: { title: string, description: string } | null
 *  - navigateTo: route path
 *  - ctaLabel: string for the CTA button
 *  - badge: optional string (e.g. "Res. 89/25")
 *  - defaultOpen: boolean
 */
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
    const navigate = useNavigate()
    const [isOpen, setIsOpen] = useState(defaultOpen)

    // Map accent color to tailwind classes
    const colorMap = {
        emerald: {
            bg: 'bg-[#005a36]/10 dark:bg-emerald-950/30',
            text: 'text-[#005a36] dark:text-emerald-400',
            border: 'border-[#005a36]/30 dark:border-emerald-800/50',
            accent: 'bg-[#005a36]',
            tipBg: 'bg-[#005a36]/5 dark:bg-emerald-950/20',
            tipBorder: 'border-[#005a36]/20 dark:border-emerald-800/40',
            check: 'text-[#005a36] dark:text-emerald-400',
            btn: 'bg-[#005a36] text-white hover:bg-[#004a2c]',
        },
        amber: {
            bg: 'bg-amber-500/10 dark:bg-amber-950/30',
            text: 'text-amber-600 dark:text-amber-400',
            border: 'border-amber-500/30 dark:border-amber-800/50',
            accent: 'bg-amber-500',
            tipBg: 'bg-amber-500/5 dark:bg-amber-950/20',
            tipBorder: 'border-amber-500/20 dark:border-amber-800/40',
            check: 'text-amber-600 dark:text-amber-400',
            btn: 'bg-[#F5B82E] text-slate-950 hover:bg-amber-400',
        },
        indigo: {
            bg: 'bg-indigo-500/10 dark:bg-indigo-950/30',
            text: 'text-indigo-600 dark:text-indigo-400',
            border: 'border-indigo-500/30 dark:border-indigo-800/50',
            accent: 'bg-indigo-500',
            tipBg: 'bg-indigo-500/5 dark:bg-indigo-950/20',
            tipBorder: 'border-indigo-500/20 dark:border-indigo-800/40',
            check: 'text-indigo-600 dark:text-indigo-400',
            btn: 'bg-indigo-600 text-white hover:bg-indigo-700',
        },
        rose: {
            bg: 'bg-rose-500/10 dark:bg-rose-950/30',
            text: 'text-rose-600 dark:text-rose-400',
            border: 'border-rose-500/30 dark:border-rose-800/50',
            accent: 'bg-rose-500',
            tipBg: 'bg-rose-500/5 dark:bg-rose-950/20',
            tipBorder: 'border-rose-500/20 dark:border-rose-800/40',
            check: 'text-rose-600 dark:text-rose-400',
            btn: 'bg-rose-600 text-white hover:bg-rose-700',
        },
    }

    const c = colorMap[accentColor] || colorMap.emerald

    return (
        <div
            className={`rounded-3xl border ${isOpen ? c.border : 'border-default-200'} bg-background overflow-hidden transition-all duration-300 ${isOpen ? 'shadow-lg' : 'shadow-xs hover:shadow-md'}`}
        >
            {/* Header — always visible, clickable */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-4 p-5 text-left transition-colors hover:bg-default-50/80 dark:hover:bg-default-100/50 cursor-pointer"
            >
                <div className={`w-12 h-12 rounded-2xl ${c.bg} flex items-center justify-center shrink-0`}>
                    <i className={`fa-solid ${icon} text-lg ${c.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-black text-foreground">{title}</h3>
                        {badge && (
                            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#F5B82E] text-slate-950 shadow-2xs">
                                {badge}
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-foreground/60 mt-0.5">{subtitle}</p>
                </div>
                <div className={`w-8 h-8 rounded-xl ${isOpen ? c.bg : 'bg-default-100'} flex items-center justify-center transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <i className={`fa-solid fa-chevron-down text-xs ${isOpen ? c.text : 'text-foreground/40'}`} />
                </div>
            </button>

            {/* Content — expandible */}
            <div
                className={`grid transition-all duration-300 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                    <div className="px-6 pb-6 pt-1 space-y-5">
                        {/* Custom visual element if provided */}
                        {children && (
                            <div className="pt-2">
                                {children}
                            </div>
                        )}

                        {/* Feature checklist */}
                        <ul className="space-y-2.5">
                            {features.map((feature, idx) => (
                                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/75">
                                    <i className={`fa-solid fa-circle-check text-xs mt-1 shrink-0 ${c.check}`} />
                                    <span className="leading-relaxed">{feature}</span>
                                </li>
                            ))}
                        </ul>

                        {/* Pro Tip */}
                        {proTip && (
                            <div className={`p-4 rounded-2xl ${c.tipBg} border ${c.tipBorder}`}>
                                <div className="flex items-center gap-2 mb-1.5">
                                    <i className={`fa-solid fa-lightbulb text-xs ${c.text}`} />
                                    <span className={`text-xs font-black uppercase tracking-wider ${c.text}`}>
                                        {proTip.title || 'Pro Tip'}
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed">
                                    {proTip.description}
                                </p>
                            </div>
                        )}

                        {/* CTA */}
                        {navigateTo && (
                            <div className="pt-2">
                                <Button
                                    size="sm"
                                    onPress={() => navigate(navigateTo)}
                                    className={`font-black text-xs px-5 py-2 rounded-xl shadow-xs ${c.btn} w-full sm:w-auto`}
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
    )
}
