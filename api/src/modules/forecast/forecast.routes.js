// src/modules/forecast/forecast.routes.js
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { resolveCompanyScope } from '../../middleware/resolveCompanyScope.js';
import { validate } from '../../middleware/validate.js';
import {
  assumptionsSchema,
  saveSimulationSchema,
  updateSimulationSchema,
  compareSimulationsSchema,
  curveFitSchema,
} from './forecast.validation.js';
import {
  simulateForecast,
  saveSimulation,
  listSimulations,
  getSimulation,
  updateSimulation,
  archiveSimulation,
  compareSimulations,
  calibrateCurve,
} from './forecast.controller.js';

export const forecastRouter = Router();

const ALL_COMPANY = ['company_admin', 'analyst', 'viewer'];
const WRITERS = ['company_admin', 'analyst'];

// All forecast routes require authentication and company scope
forecastRouter.use(requireAuth, requireRole(...ALL_COMPANY), resolveCompanyScope);

const idParamSchema = z.object({
  id: z.string().uuid({ message: 'Invalid simulation ID' }),
});

// Live simulation (no saving)
forecastRouter.post(
  '/simulate',
  requireRole(...WRITERS),
  validate(z.object({ body: assumptionsSchema })),
  simulateForecast
);

// Save new simulation
forecastRouter.post(
  '/simulations',
  requireRole(...WRITERS),
  validate(z.object({ body: saveSimulationSchema })),
  saveSimulation
);

// List company simulations
forecastRouter.get(
  '/simulations',
  listSimulations
);

// Compare 2-4 simulations
forecastRouter.post(
  '/compare',
  validate(z.object({ body: compareSimulationsSchema })),
  compareSimulations
);

// Optional curve fit calibration
forecastRouter.post(
  '/calibrate',
  requireRole(...WRITERS),
  validate(z.object({ body: curveFitSchema })),
  calibrateCurve
);

// Get single simulation
forecastRouter.get(
  '/simulations/:id',
  validate(z.object({ params: idParamSchema })),
  getSimulation
);

// Update simulation
forecastRouter.patch(
  '/simulations/:id',
  requireRole(...WRITERS),
  validate(z.object({ params: idParamSchema, body: updateSimulationSchema })),
  updateSimulation
);

// Archive (soft delete) simulation
forecastRouter.delete(
  '/simulations/:id',
  requireRole(...WRITERS),
  validate(z.object({ params: idParamSchema })),
  archiveSimulation
);
