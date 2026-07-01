import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class OutputRouterService {
  private readonly logger = new Logger(OutputRouterService.name);

  constructor() {}
}
