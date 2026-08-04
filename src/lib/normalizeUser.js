const VERIFIED_ADDRESS_FIELDS = [
  "street_address",
  "street",
  "city",
  "state",
  "zip_code",
  "zip",
  "address_lat",
  "address_lng",
  "latitude",
  "longitude",
  "formatted_address",
  "display_address",
  "address",
  "primary_address",
  "primary_latitude",
  "primary_longitude",
  "primary_address_verified",
  "address_verified",
  "address_verified_at",
  "primary_address_verified_at",
  "address_confirmation_status",
  "has_primary_address",
  "address_verification_required",
];

export function normalizeUser(user) {
  if (!user) return user;

  const data = user.data && typeof user.data === "object" ? user.data : {};
  const normalized = { ...user };

  VERIFIED_ADDRESS_FIELDS.forEach((field) => {
    if (normalized[field] === undefined || normalized[field] === null || normalized[field] === "") {
      if (data[field] !== undefined && data[field] !== null && data[field] !== "") {
        normalized[field] = data[field];
      }
    }
  });

  normalized.street_address = normalized.street_address || data.street_address || data.street || normalized.street || "";
  normalized.city = normalized.city || data.city || "";
  normalized.state = normalized.state || data.state || "";
  normalized.zip_code = normalized.zip_code || data.zip_code || data.zip || normalized.zip || "";
  normalized.address_lat = normalized.address_lat ?? data.address_lat ?? data.latitude ?? normalized.latitude ?? null;
  normalized.address_lng = normalized.address_lng ?? data.address_lng ?? data.longitude ?? normalized.longitude ?? null;
  normalized.primary_latitude = normalized.primary_latitude ?? data.primary_latitude ?? normalized.address_lat;
  normalized.primary_longitude = normalized.primary_longitude ?? data.primary_longitude ?? normalized.address_lng;
  normalized.primary_address = normalized.primary_address || data.primary_address || data.formatted_address || data.display_address || data.address || normalized.address || normalized.street_address || "";
  normalized.primary_address_verified = normalized.primary_address_verified === true || data.primary_address_verified === true;
  normalized.address_verified = normalized.address_verified === true || data.address_verified === true;
  normalized.address_confirmation_status = normalized.address_confirmation_status || data.address_confirmation_status || "unconfirmed";

  return normalized;
}

export function buildVerifiedAddressUpdate(fields = {}, existingUser = null) {
  const data = existingUser?.data && typeof existingUser.data === "object" ? existingUser.data : {};
  const verifiedFields = {};

  VERIFIED_ADDRESS_FIELDS.forEach((field) => {
    if (fields[field] !== undefined) {
      verifiedFields[field] = fields[field];
    }
  });

  return {
    ...fields,
    data: {
      ...data,
      ...verifiedFields,
    },
  };
}