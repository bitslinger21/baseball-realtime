import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MemoryManagerService {
  private readonly logger = new Logger(MemoryManagerService.name);

  constructor() {}
}
