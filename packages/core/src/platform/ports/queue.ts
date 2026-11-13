// Nudging the job consumer: Cloudflare Queues or `waitUntil`, waking the self-host poller.
// Correctness lives in the outbox table (04-olaylar-isler-outbox); even if the nudge is lost, the poller processes the job.
export type Job = { type: string; payload?: unknown }

export type Enqueue = (job: Job) => Promise<void>
