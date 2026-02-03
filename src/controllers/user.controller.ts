import { Request, Response, NextFunction } from 'express';
import userService from '../services/user.service';

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const user = await userService.getUserById(id);

    res.status(200).json(user);
  } catch (error: any) {
    next(error);
  }
};

export const getDesignerProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const profile = await userService.getDesignerProfile(id);

    res.status(200).json(profile);
  } catch (error: any) {
    next(error);
  }
};
