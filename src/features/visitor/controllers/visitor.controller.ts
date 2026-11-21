import { Request, Response } from 'express';

import { sendData } from '../../../utils/response.util';
import { VisitorService } from '../services/visitor.service';
import { UpsertVisitorInput, VisitorLookupQuery } from '../types/visitor.types';

export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  upsert = async (req: Request<{}, {}, UpsertVisitorInput>, res: Response): Promise<void> => {
    sendData(res, await this.visitorService.upsert(req.body));
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const { phone } = req.query as unknown as VisitorLookupQuery;
    sendData(res, await this.visitorService.getByPhone(phone));
  };
}
