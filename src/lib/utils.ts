import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTurnoBadgeText(inicio: string | null, fim: string | null) {
  if (!inicio || !fim) return null;
  const h = parseInt(inicio.split(":")[0], 10);
  const iniFormat = inicio.slice(0, 5);
  const fimFormat = fim.slice(0, 5);
  
  if (h >= 0 && h <= 12) return `☀️ Manhã (${iniFormat} - ${fimFormat})`;
  if (h > 12 && h < 18) return `🌤️ Tarde (${iniFormat} - ${fimFormat})`;
  return `🌙 Noite (${iniFormat} - ${fimFormat})`;
}
