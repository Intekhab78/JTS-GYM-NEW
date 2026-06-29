import Setting from '../models/Setting.js';

export const getTransactionSnapshots = async (user = null, guestDetails = null) => {
  const settings = await Setting.find({ key: { $in: ['company_info', 'currency'] } });
  const companyInfoSetting = settings.find(s => s.key === 'company_info')?.value || {};
  const globalCurrencySetting = settings.find(s => s.key === 'currency')?.value;
  const currency = companyInfoSetting.currency || globalCurrencySetting || 'AED';

  const companySnapshot = {
    name: companyInfoSetting.name || 'JTS Booking',
    address: companyInfoSetting.address || '',
    email: companyInfoSetting.email || '',
    phone: companyInfoSetting.phone || '',
    invoiceTerms: companyInfoSetting.invoiceTerms || '',
    logoUrl: companyInfoSetting.logoUrl || ''
  };

  let customerSnapshot = null;
  if (user) {
    customerSnapshot = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address,
      companyName: user.companyName
    };
  } else if (guestDetails) {
    customerSnapshot = {
      name: guestDetails.name,
      email: guestDetails.email,
      phone: guestDetails.phone
    };
  }

  return { currency, companySnapshot, customerSnapshot };
};
