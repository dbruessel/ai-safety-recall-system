import requests

NHTSA_DECODE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/{vin}?format=json"
NHTSA_RECALL_URL = "https://api.nhtsa.gov/recalls/recallsByVehicle?vin={vin}"

def decode_vin(vin: str):
    """Decode VIN using NHTSA API."""
    url = NHTSA_DECODE_URL.format(vin=vin)
    response = requests.get(url)
    data = response.json()

    if "Results" in data and len(data["Results"]) > 0:
        return data["Results"][0]

    return {}

def get_recalls_for_vin(vin: str):
    """Fetch recall data for a VIN using NHTSA API."""
    url = NHTSA_RECALL_URL.format(vin=vin)
    response = requests.get(url)
    data = response.json()

    if "results" in data:
        return data["results"]

    return []
