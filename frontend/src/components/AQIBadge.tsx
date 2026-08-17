import React from 'react';
import { getAQICategory } from '../utils/aqi.util';
import { useLanguage } from '../context/LanguageContext';
import { ShieldCheck, AlertTriangle, AlertOctagon, Flame, ShieldAlert, Sparkles } from 'lucide-react';

interface AQIBadgeProps {
  aqi: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  showIcon?: boolean;
  className?: string;
  id?: string;
}

export const AQIBadge: React.FC<AQIBadgeProps> = ({
  aqi,
  size = 'md',
  showNumber = false,
  showIcon = true,
  className = '',
  id,
}) => {
  const { lang } = useLanguage();
  const category = getAQICategory(aqi);

  const getIcon = () => {
    switch (category.level) {
      case 'good':
        return <Sparkles className="w-3.5 h-3.5" />;
      case 'moderate':
        return <ShieldCheck className="w-3.5 h-3.5" />;
      case 'unhealthy_sensitive':
        return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'unhealthy':
        return <AlertOctagon className="w-3.5 h-3.5" />;
      case 'very_unhealthy':
        return <ShieldAlert className="w-3.5 h-3.5" />;
      case 'hazardous':
        return <Flame className="w-3.5 h-3.5" />;
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs font-semibold px-2.5 py-1 gap-1.5',
    lg: 'text-sm font-bold px-3.5 py-1.5 gap-2',
  };

  const label = lang === 'vi' ? category.labelVi : category.labelEn;

  return (
    <span
      id={id}
      style={{
        backgroundColor: category.bgColor,
        color: category.textColor,
        borderColor: category.borderColor,
      }}
      className={`inline-flex items-center rounded-full border border-opacity-40 font-medium tracking-wide transition-all ${sizeClasses[size]} ${className}`}
    >
      {showIcon && getIcon()}
      {showNumber && <span className="font-bold">{Math.round(aqi)}</span>}
      <span>{label}</span>
    </span>
  );
};
