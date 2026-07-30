export function openPaystack(email: string, amount: number): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const scriptId = 'paystack-inline-js';
    let script = document.getElementById(scriptId) as HTMLScriptElement | null;

    const launch = () => {
      try {
        const popup = new (window as any).PaystackPop();
        popup.newTransaction({
          key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
          email,
          amount: Math.round(amount * 100),
          currency: 'NGN',
          onSuccess: () => resolve(),
          onCancel: () => reject(new Error('Payment cancelled')),
        });
      } catch (err) {
        reject(err);
      }
    };

    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://js.paystack.co/v2/inline.js';
      script.async = true;
      script.onload = launch;
      script.onerror = () => reject(new Error('Failed to load Paystack'));
      document.body.appendChild(script);
      return;
    }

    if ((window as any).PaystackPop) launch();
    else script.addEventListener('load', launch);
  });
}
