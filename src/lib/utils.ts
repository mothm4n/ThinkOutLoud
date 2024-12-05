import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Función para combinar clases de Tailwind de manera eficiente
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
} 