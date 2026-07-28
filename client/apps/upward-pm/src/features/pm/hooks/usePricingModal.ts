import { useState, useEffect } from 'react';

let pricingModalOpen = false;
const listeners = new Set<(open: boolean) => void>();

export function usePricingModal() {
  const [isOpen, setIsOpen] = useState(pricingModalOpen);

  useEffect(() => {
    const onChange = (open: boolean) => setIsOpen(open);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  const openPricing = () => {
    pricingModalOpen = true;
    listeners.forEach((l) => l(true));
  };

  const closePricing = () => {
    pricingModalOpen = false;
    listeners.forEach((l) => l(false));
  };

  return { isOpen, openPricing, closePricing };
}
