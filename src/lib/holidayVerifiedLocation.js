import { normalizeUser } from '@/lib/normalizeUser';
import { hasVerifiedPrimaryAddress } from '@/lib/trustActions';

export default function holidayVerifiedLocation(user) {
  const profile = normalizeUser(user);
  if (!hasVerifiedPrimaryAddress(profile)) return null;
  const latitude = profile.primary_latitude;
  const longitude = profile.primary_longitude;
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return {
    street_address: profile.street_address.trim(),
    city: profile.city.trim(),
    state: profile.state.trim(),
    zip_code: profile.zip_code.trim(),
    address: [profile.street_address.trim(), profile.city.trim(), `${profile.state.trim()} ${profile.zip_code.trim()}`].join(', '),
    latitude,
    longitude,
  };
}