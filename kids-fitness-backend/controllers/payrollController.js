import asyncHandler from 'express-async-handler';
import Trainer from '../models/Trainer.js';
import Session from '../models/Session.js';

// @desc    Get payroll report for trainers
// @route   GET /api/trainers/payroll
// @access  Private/Admin
export const getTrainerPayroll = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    res.status(400);
    throw new Error('Please provide both startDate and endDate');
  }

  // Find all active trainers
  const trainers = await Trainer.find({});
  
  const payrollData = await Promise.all(
    trainers.map(async (trainer) => {
      let totalPayout = 0;
      let sessionsCount = 0;

      if (trainer.compensationType === 'SALARY') {
        // For salaried trainers, the payout is just their fixed rate.
        totalPayout = trainer.compensationRate || 0;
      } else if (trainer.compensationType === 'PER_SESSION') {
        // For per-session trainers, calculate based on sessions in date range
        const query = {
          trainerId: trainer._id,
          status: { $ne: 'cancelled' },
          startTime: { 
            $gte: new Date(startDate), 
            $lte: new Date(endDate) 
          }
        };

        sessionsCount = await Session.countDocuments(query);
        totalPayout = sessionsCount * (trainer.compensationRate || 0);
      }

      return {
        _id: trainer._id,
        name: trainer.name,
        compensationType: trainer.compensationType,
        compensationRate: trainer.compensationRate || 0,
        sessionsCount,
        totalPayout
      };
    })
  );

  res.json(payrollData);
});
