import { Injectable } from '@nestjs/common'

export interface JobProgress {
  id: string
  total: number
  processed: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  message?: string
}

@Injectable()
export class EmailBatchRetryManager {
  private jobs = new Map<string, JobProgress>()

  createJob(id: string, total: number): JobProgress {
    const job: JobProgress = {
      id,
      total,
      processed: 0,
      status: 'pending',
    }
    this.jobs.set(id, job)
    return job
  }

  getJob(id: string): JobProgress | undefined {
    return this.jobs.get(id)
  }

  updateJob(id: string, updates: Partial<Omit<JobProgress, 'id'>>): JobProgress | undefined {
    const job = this.jobs.get(id)
    if (!job) return undefined

    const updatedJob = { ...job, ...updates }
    this.jobs.set(id, updatedJob)
    return updatedJob
  }
}
