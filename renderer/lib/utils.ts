import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


export const badgeColor = (impact? : number, severity? : string) => {
  if (!impact && !severity) return;
  if (impact) {
    if (impact >= 0.0 && impact <= 3.0) {
      return "bg-green-500"
    }
    if (impact >= 3.1 && impact <= 7.0) {
      return "bg-orange-500"
    }
    if (impact >= 7.1 && impact <= 10.0) {
      return "bg-red-500";
    }
  }
}