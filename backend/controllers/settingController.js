import asyncHandler from 'express-async-handler';
import Counter from '../models/Counter.js';
import Setting from '../models/Setting.js';

// @desc    Get all system sequence counters
// @route   GET /api/settings/counters
// @access  Private/Admin
export const getCounters = asyncHandler(async (req, res) => {
  const counters = await Counter.find({});
  res.json(counters);
});

// @desc    Update a specific sequence counter
// @route   PUT /api/settings/counters/:name
// @access  Private/Admin
export const updateCounter = asyncHandler(async (req, res) => {
  const { name } = req.params;
  const { seq } = req.body;

  if (seq === undefined || isNaN(seq)) {
    res.status(400);
    throw new Error('Valid sequence number is required');
  }

  const result = await Counter.findOneAndUpdate(
    { name },
    { $set: { seq: Number(seq) } },
    { new: true, upsert: true }
  );

  res.json(result);
});

// @desc    Get all global settings
// @route   GET /api/settings/global
// @access  Public (filtered) or Private/Admin
export const getGlobalSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.find({});
  const processedSettings = settings.map(setting => {
    const settingObj = setting.toObject();
    if (settingObj.key === 'payment_gateway_settings' && settingObj.value) {
      ['razorpay', 'stripe', 'paypal'].forEach(provider => {
        if (settingObj.value[provider]) {
          if (settingObj.value[provider].keySecret) settingObj.value[provider].keySecret = '••••••••••••••••';
          if (settingObj.value[provider].webhookSecret) settingObj.value[provider].webhookSecret = '••••••••••••••••';
        }
      });
    } else if (settingObj.key === 'razorpay_settings' && settingObj.value) {
      if (settingObj.value.keySecret) {
        settingObj.value.keySecret = '••••••••••••••••';
      }
      if (settingObj.value.webhookSecret) {
        settingObj.value.webhookSecret = '••••••••••••••••';
      }
    }
    return settingObj;
  });
  res.json(processedSettings);
});

// @desc    Update a global setting
// @route   PUT /api/settings/global/:key
// @access  Private/Admin
export const updateGlobalSetting = asyncHandler(async (req, res) => {
  const { key } = req.params;
  let { value, description } = req.body;

  if (key === 'payment_gateway_settings') {
    const existing = await Setting.findOne({ key });
    if (existing && existing.value) {
      const mergedValue = { ...value };
      ['razorpay', 'stripe', 'paypal'].forEach(provider => {
        if (mergedValue[provider] && existing.value[provider]) {
          if (mergedValue[provider].keySecret === '••••••••••••••••') {
            mergedValue[provider].keySecret = existing.value[provider].keySecret;
          }
          if (mergedValue[provider].webhookSecret === '••••••••••••••••') {
            mergedValue[provider].webhookSecret = existing.value[provider].webhookSecret;
          }
        }
      });
      value = mergedValue;
    }
  } else if (key === 'razorpay_settings') {
    const existing = await Setting.findOne({ key });
    if (existing && existing.value) {
      const mergedValue = { ...value };
      if (value.keySecret === '••••••••••••••••') {
        mergedValue.keySecret = existing.value.keySecret;
      }
      if (value.webhookSecret === '••••••••••••••••') {
        mergedValue.webhookSecret = existing.value.webhookSecret;
      }
      value = mergedValue;
    }
  }

  const setting = await Setting.findOneAndUpdate(
    { key },
    { $set: { value, description } },
    { new: true, upsert: true }
  );

  // Send back the response with masked keys to be safe
  if (key === 'payment_gateway_settings' && setting.value) {
    const masked = setting.toObject();
    ['razorpay', 'stripe', 'paypal'].forEach(provider => {
      if (masked.value[provider]) {
        if (masked.value[provider].keySecret) masked.value[provider].keySecret = '••••••••••••••••';
        if (masked.value[provider].webhookSecret) masked.value[provider].webhookSecret = '••••••••••••••••';
      }
    });
    return res.json(masked);
  } else if (key === 'razorpay_settings' && setting.value) {
    const masked = setting.toObject();
    if (masked.value.keySecret) masked.value.keySecret = '••••••••••••••••';
    if (masked.value.webhookSecret) masked.value.webhookSecret = '••••••••••••••••';
    return res.json(masked);
  }

  res.json(setting);
});
