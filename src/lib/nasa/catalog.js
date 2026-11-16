/* Catálogo puro, compartido por navegador, workers y descarga Node. */
  export const VARIABLES = {
    T2M: { u: '°C', d: 2, rel: false, es: ['Temperatura del aire (2 m)', 'Qué tan cálido está el aire cerca del suelo.'], en: ['Air temperature (2 m)', 'How warm the air is near the ground.'] },
    T2M_MAX: { u: '°C', d: 2, rel: false, es: ['Temperatura máxima diaria', 'Promedio mensual de la temperatura más alta de cada día.'], en: ['Daily maximum temperature', 'Monthly average of each day’s highest temperature.'] },
    T2M_MIN: { u: '°C', d: 2, rel: false, es: ['Temperatura mínima diaria', 'Promedio mensual de la temperatura más baja de cada día.'], en: ['Daily minimum temperature', 'Monthly average of each day’s lowest temperature.'] },
    T2MDEW: { u: '°C', d: 2, rel: false, es: ['Punto de rocío', 'Temperatura a la que el aire se satura de vapor. Refleja cuánta humedad hay.'], en: ['Dew point', 'Temperature at which the air saturates. It reflects how much moisture there is.'] },
    TS: { u: '°C', d: 2, rel: false, es: ['Temperatura de la superficie', 'Temperatura del suelo, el hielo o el mar en la superficie.'], en: ['Surface skin temperature', 'Temperature of the ground, ice or sea surface.'] },
    RH2M: { u: '%', d: 1, rel: true, es: ['Humedad relativa', 'Porcentaje de vapor de agua del aire respecto al máximo posible.'], en: ['Relative humidity', 'Share of the water vapor the air could hold.'] },
    QV2M: { u: 'g/kg', d: 2, rel: true, es: ['Humedad específica', 'Gramos de vapor de agua por kilogramo de aire.'], en: ['Specific humidity', 'Grams of water vapor per kilogram of air.'] },
    PRECTOTCORR: { u: 'mm/día', d: 2, rel: true, es: ['Precipitación', 'Lluvia o nieve caída, expresada en milímetros por día.'], en: ['Precipitation', 'Rain or snow, in millimeters per day.'] },
    EVLAND: { u: 'mm/día', d: 2, rel: true, es: ['Evaporación', 'Agua que pasa del suelo y las plantas al aire. Si sube y la lluvia no, el lugar se seca.'], en: ['Evaporation', 'Water moving from soil and plants to the air. If it rises and rain does not, the place dries.'] },
    PS: { u: 'kPa', d: 2, rel: false, es: ['Presión en superficie', 'Peso del aire sobre el lugar.'], en: ['Surface pressure', 'Weight of the air above the place.'] },
    WS10M: { u: 'm/s', d: 2, rel: true, es: ['Velocidad del viento (10 m)', 'Qué tan rápido sopla el viento a 10 metros de altura.'], en: ['Wind speed (10 m)', 'How fast the wind blows at 10 meters.'] },
    ALLSKY_SFC_SW_DWN: { u: 'kW·h/m²/día', d: 2, rel: true, es: ['Radiación solar en superficie', 'Energía solar que llega al suelo, con las nubes reales.'], en: ['Surface solar radiation', 'Solar energy reaching the ground, with real clouds.'] },
    CLOUD_AMT: { u: '%', d: 1, rel: true, es: ['Nubosidad', 'Porcentaje del cielo cubierto por nubes.'], en: ['Cloud amount', 'Share of the sky covered by clouds.'] },
    GWETTOP: { u: '', d: 3, rel: true, es: ['Humedad del suelo (superficie)', 'Qué tan mojada está la capa superior del suelo. 0 es seco y 1 saturado.'], en: ['Surface soil wetness', 'How wet the top soil layer is. 0 is dry, 1 is saturated.'] },
    GWETROOT: { u: '', d: 3, rel: true, es: ['Humedad de la zona de raíces', 'Agua disponible para las plantas en la zona de raíces.'], en: ['Root zone soil wetness', 'Water available to plants in the root zone.'] },
    GWETPROF: { u: '', d: 3, rel: true, es: ['Humedad del perfil del suelo', 'Humedad del suelo en toda su profundidad.'], en: ['Soil profile wetness', 'Wetness of the soil through its full depth.'] }
  };
  VARIABLES.CSV = { u: '', d: 3, rel: true, es: ['Serie subida (CSV)', 'Tu propia serie de Giovanni, AppEEARS, CDO o KNMI.'], en: ['Uploaded series (CSV)', 'Your own series from Giovanni, AppEEARS, CDO or KNMI.'] };
  export const KEYS = Object.keys(VARIABLES).filter(function (k) { return k !== 'CSV'; });

  export const PLACES = [
    { id: 'moq', es: 'Moquegua, Perú', en: 'Moquegua, Peru', lat: -17.19, lon: -70.93, b: 'mountain' },
    { id: 'ama', es: 'Amazonía peruana', en: 'Peruvian Amazon', lat: -3.75, lon: -73.25, b: 'forest' },
    { id: 'ata', es: 'Desierto de Atacama', en: 'Atacama Desert', lat: -24.5, lon: -69.25, b: 'desert' },
    { id: 'art', es: 'Ártico (Svalbard)', en: 'Arctic (Svalbard)', lat: 78.2, lon: 15.6, b: 'polar' },
    { id: 'sah', es: 'Sahel (Níger)', en: 'Sahel (Niger)', lat: 14.0, lon: 2.0, b: 'desert' },
    { id: 'him', es: 'Himalaya (Nepal)', en: 'Himalaya (Nepal)', lat: 28.0, lon: 84.0, b: 'mountain' },
    { id: 'mex', es: 'Ciudad de México', en: 'Mexico City', lat: 19.43, lon: -99.13, b: 'city' },
    { id: 'med', es: 'Mar Mediterráneo', en: 'Mediterranean Sea', lat: 35.0, lon: 18.0, b: 'coast' },
    { id: 'lim', es: 'Lima, Perú', en: 'Lima, Peru', lat: -12.05, lon: -77.04, b: 'city' },
    { id: 'tit', es: 'Lago Titicaca', en: 'Lake Titicaca', lat: -15.8, lon: -69.4, b: 'mountain' },
    { id: 'cus', es: 'Cusco, Perú', en: 'Cusco, Peru', lat: -13.53, lon: -71.97, b: 'mountain' },
    { id: 'piu', es: 'Piura, Perú', en: 'Piura, Peru', lat: -5.19, lon: -80.63, b: 'coast' },
    { id: 'nyc', es: 'Nueva York', en: 'New York', lat: 40.71, lon: -74.0, b: 'city' },
    { id: 'cal', es: 'California (Valle Central)', en: 'California (Central Valley)', lat: 36.7, lon: -119.8, b: 'desert' },
    { id: 'gro', es: 'Groenlandia', en: 'Greenland', lat: 72.0, lon: -40.0, b: 'polar' },
    { id: 'sib', es: 'Siberia (Yakutsk)', en: 'Siberia (Yakutsk)', lat: 62.03, lon: 129.73, b: 'polar' },
    { id: 'del', es: 'Delhi, India', en: 'Delhi, India', lat: 28.61, lon: 77.21, b: 'city' },
    { id: 'gan', es: 'Delta del Ganges', en: 'Ganges Delta', lat: 22.5, lon: 89.5, b: 'coast' },
    { id: 'cer', es: 'Cerrado (Brasil)', en: 'Cerrado (Brazil)', lat: -15.8, lon: -47.9, b: 'forest' },
    { id: 'con', es: 'Cuenca del Congo', en: 'Congo Basin', lat: 0.0, lon: 22.0, b: 'forest' },
    { id: 'cap', es: 'Ciudad del Cabo', en: 'Cape Town', lat: -33.92, lon: 18.42, b: 'coast' },
    { id: 'aus', es: 'Australia (Murray-Darling)', en: 'Australia (Murray-Darling)', lat: -34.0, lon: 144.0, b: 'desert' },
    { id: 'ant', es: 'Península Antártica', en: 'Antarctic Peninsula', lat: -64.8, lon: -62.9, b: 'polar' },
    { id: 'mad', es: 'Madrid, España', en: 'Madrid, Spain', lat: 40.42, lon: -3.7, b: 'city' },
    { id: 'nil', es: 'Delta del Nilo', en: 'Nile Delta', lat: 31.0, lon: 31.0, b: 'coast' },
    { id: 'mek', es: 'Delta del Mekong', en: 'Mekong Delta', lat: 10.5, lon: 105.5, b: 'coast' },
    { id: 'tok', es: 'Tokio, Japón', en: 'Tokyo, Japan', lat: 35.68, lon: 139.69, b: 'city' },
    { id: 'yel', es: 'Canadá (Yellowknife)', en: 'Canada (Yellowknife)', lat: 62.45, lon: -114.37, b: 'polar' },
    { id: 'alp', es: 'Alpes', en: 'Alps', lat: 46.5, lon: 9.8, b: 'mountain' },
    { id: 'bor', es: 'Borneo', en: 'Borneo', lat: 0.5, lon: 114.0, b: 'forest' }
  ];

