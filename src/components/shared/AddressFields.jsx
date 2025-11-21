import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"
];

export default function AddressFields({ formData, setFormData, required = true }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="street_address">
          Street Address {required && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id="street_address"
          placeholder="123 Main St"
          value={formData.street_address || ""}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, street_address: e.target.value }))
          }
          required={required}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">
            City {required && <span className="text-red-500">*</span>}
          </Label>
          <Input
            id="city"
            placeholder="City"
            value={formData.city || ""}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, city: e.target.value }))
            }
            required={required}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="state">
            State {required && <span className="text-red-500">*</span>}
          </Label>
          <Select
            value={formData.state || ""}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, state: value }))
            }
          >
            <SelectTrigger id="state">
              <SelectValue placeholder="Select state" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((state) => (
                <SelectItem key={state} value={state}>
                  {state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="zip_code">
          ZIP Code {required && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id="zip_code"
          placeholder="12345"
          value={formData.zip_code || ""}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, zip_code: e.target.value }))
          }
          required={required}
          maxLength={5}
        />
      </div>
    </>
  );
}