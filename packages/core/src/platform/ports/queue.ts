// İş tüketicisini dürtme: Cloudflare Queues veya `waitUntil`, self-host poller'ı uyandırma.
// Doğruluk outbox tablosundadır (04-olaylar-isler-outbox); dürtme kaybolsa da iş poller'da işlenir.
export type Job = { type: string; payload?: unknown }

export type Enqueue = (job: Job) => Promise<void>
