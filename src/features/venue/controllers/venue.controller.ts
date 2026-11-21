import { Request, Response } from 'express';

import { sendData } from '../../../utils/response.util';
import { VenueService } from '../services/venue.service';
import { SlotsQueryInput } from '../types/venue.types';

export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  listVenues = async (req: Request, res: Response): Promise<void> => {
    sendData(res, await this.venueService.listVenues());
  };

  getVenue = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    sendData(res, await this.venueService.getVenue(req.params.id));
  };

  getSlots = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    const { date, pitchId } = req.query as unknown as SlotsQueryInput;
    sendData(res, await this.venueService.getSlots(req.params.id, date, pitchId));
  };

  listOffers = async (req: Request<{ id: string }>, res: Response): Promise<void> => {
    sendData(res, await this.venueService.listActiveOffers(req.params.id));
  };
}
