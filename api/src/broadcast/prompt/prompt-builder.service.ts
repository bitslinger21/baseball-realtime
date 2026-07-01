import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PromptBuilderService {
  private readonly logger = new Logger(PromptBuilderService.name);

  constructor() {}
}
