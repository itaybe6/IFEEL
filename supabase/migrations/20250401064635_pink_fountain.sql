/*
  # Fix installation_devices schema

  1. Changes
    - Add device_type column to installation_devices table
    - Update foreign key constraint to reference devices table
*/

-- First ensure the device_type column exists
ALTER TABLE installation_devices 
ADD COLUMN IF NOT EXISTS device_type text;

-- Add foreign key constraint to reference devices table
ALTER TABLE installation_devices
ADD CONSTRAINT installation_devices_device_type_fkey
FOREIGN KEY (device_type) 
REFERENCES devices(name)
ON UPDATE CASCADE;