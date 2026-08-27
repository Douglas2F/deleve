"""Approximate ACTIVE calories, not total energy expenditure.

Reference: 2024 Adult Compendium of Physical Activities, https://pacompendium.com/
1 MET ~= 1 kcal/kg/hour. Subtract 1 MET to exclude resting energy.
No sensors, hills, wind, load or individual metabolic calibration are available.
General references are not individual measurements or medical recommendations.
"""
import math


METHOD = "adult-compendium-2024-active-v2"
EFFORTS = ("light", "moderate", "intense")
GENERAL = {
    "Musculação": (3.5, "02054", "conditioning-exercise", "Musculação com exercícios variados"),
    "Dança": (3.8, "03070", "dancing", "Referência de dança contemporânea geral"),
    "Futebol": (7.0, "15610", "sports", "Futebol recreativo"),
    "Corrida": (7.5, "12020", "running", "Trote em ritmo livre"),
    "Ciclismo": (7.0, "01014", "bicycling", "Ciclismo geral"),
}

# UI effort categories choose published activity examples, not a validated
# conversion from perceived exertion to METs. These are population-level proxies.
# Preserve the general reference where no distinct light/moderate entry exists.
# Running has no effort-only mapping: speed is needed to refine its estimate.
EFFORT_REFERENCES = {
    "Musculação": {
        "light": (3.5, "02054", "Musculação com exercícios variados"),
        "moderate": (3.5, "02054", "Musculação com exercícios variados"),
        "intense": (6.0, "02050", "Musculação com esforço vigoroso"),
    },
    "Dança": {
        "light": (3.0, "03040", "Referência de dança de salão lenta"),
        "moderate": (5.0, "03010", "Referência de aula de dança moderna, balé ou jazz"),
        "intense": (6.8, "03012", "Referência de dança moderna, balé ou jazz vigorosos"),
    },
    "Futebol": {
        "light": (7.0, "15610", "Futebol recreativo; sem referência distinta para esforço leve"),
        "moderate": (7.0, "15610", "Futebol recreativo"),
        "intense": (9.5, "15605", "Referência de futebol competitivo"),
    },
    "Ciclismo": {
        "light": (4.3, "01015", "Ciclismo em ritmo leve escolhido pela pessoa"),
        "moderate": (7.0, "01016", "Ciclismo em ritmo moderado escolhido pela pessoa"),
        "intense": (9.0, "01017", "Ciclismo em ritmo vigoroso escolhido pela pessoa"),
    },
}

# Representative speeds in mph, exact METs/codes from the Compendium.
# In gaps, use the nearest published reference, never interpolate MET values.
RUNNING = [
    (3.15, 3.3, "12026"), (4.1, 6.5, "12028"), (4.55, 7.8, "12029"),
    (5.1, 8.5, "12030"), (5.65, 9.0, "12045"), (6.15, 9.3, "12050"),
    (6.7, 10.5, "12060"), (7, 11.0, "12070"), (7.5, 11.8, "12080"),
    (8, 12.0, "12090"), (8.6, 12.5, "12100"), (9, 13.0, "12110"),
    (9.45, 14.8, "12115"), (10, 14.8, "12120"), (11, 16.8, "12130"),
    (12, 18.5, "12132"), (13, 19.8, "12134"), (14, 23.0, "12135"),
]


def estimate_active_calories(exercise_type, minutes, distance_km, weight_kg, effort=None):
    if effort is not None and effort not in EFFORTS:
        raise ValueError("Escolha um esforço válido.")
    if exercise_type not in GENERAL:
        return None
    if not all(math.isfinite(float(value)) for value in (minutes, weight_kg)):
        return None
    if not 1 / 60 <= minutes <= 480 or not 20 <= weight_kg <= 400:
        return None
    met, code, category, description = GENERAL[exercise_type]
    basis = "activity"
    if effort is not None and exercise_type in EFFORT_REFERENCES:
        met, code, description = EFFORT_REFERENCES[exercise_type][effort]
        basis = "effort"
    if distance_km is not None and exercise_type in ("Corrida", "Ciclismo"):
        basis = "speed"
        if not math.isfinite(distance_km) or distance_km <= 0:
            return None
        mph = (distance_km / (minutes / 60)) / 1.609344
        if exercise_type == "Corrida":
            if not 2.6 <= mph <= 14:
                return None  # Do not extrapolate implausible/out-of-reference speeds.
            _, met, code = min(RUNNING, key=lambda row: abs(row[0] - mph))
            description = "Corrida em terreno plano, referência próxima da velocidade média"
        else:
            if not 3 <= mph <= 35:
                return None
            for upper, reference_met, reference_code in [
                (10, 4.0, "01010"), (12, 6.8, "01020"), (14, 8.0, "01030"),
                (16, 10.0, "01040"), (20, 12.0, "01050"), (36, 16.8, "01060"),
            ]:
                if mph < upper:
                    met, code = reference_met, reference_code
                    break
            description = "Bicicleta sem assistência elétrica, referência pela velocidade média"
    calories = math.floor((met - 1) * weight_kg * minutes / 60 + 0.5)
    if not 1 <= calories <= 10000:
        return None
    return {
        "calories": calories, "method": METHOD, "kind": "active", "met": met,
        "weightKg": weight_kg, "durationMinutes": minutes, "distanceKm": distance_km,
        "type": exercise_type, "referenceCode": code,
        "effort": effort, "calculationBasis": basis,
        "referenceUrl": f"https://pacompendium.com/{category}/",
        "description": description,
    }
