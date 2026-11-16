/* Silueta difuminada de un ícono que se asoma por una esquina de la tarjeta (mitad, tres cuartos…).
   Cada concepto tiene variantes de distintas librerías (Lucide, Phosphor, Remix, Tabler, Game Icons, Material) para que no se repitan siluetas iguales. */
import { motion } from 'framer-motion';
import * as Lu from 'react-icons/lu';
import * as Pi from 'react-icons/pi';
import * as Ri from 'react-icons/ri';
import * as Tb from 'react-icons/tb';
import * as Gi from 'react-icons/gi';
import * as Md from 'react-icons/md';
const G = {
  water: [Lu.LuDroplets, Pi.PiDropBold, Ri.RiWaterFlashLine, Gi.GiWaterDrop],
  fire: [Pi.PiFireBold, Ri.RiFireLine, Lu.LuFlame, Tb.TbFlame],
  sun: [Lu.LuThermometerSun, Pi.PiSunBold, Ri.RiSunLine, Tb.TbSunHigh],
  rain: [Pi.PiCloudRainBold, Ri.RiRainyLine, Lu.LuCloudRain, Tb.TbCloudRain],
  calm: [Lu.LuWaves, Pi.PiWavesBold, Ri.RiMistLine, Tb.TbWaveSine],
  trend: [Lu.LuChartLine, Pi.PiChartLineUpBold, Ri.RiLineChartLine, Tb.TbTrendingUp],
  ai: [Lu.LuBot, Pi.PiRobotBold, Ri.RiRobot2Line, Gi.GiRobotHelmet],
  chat: [Lu.LuMessagesSquare, Pi.PiChatsCircleBold, Ri.RiChat3Line, Tb.TbMessageChatbot],
  globe: [Lu.LuGlobe, Pi.PiGlobeHemisphereWestBold, Ri.RiEarthLine, Gi.GiEarthAmerica],
  sat: [Lu.LuSatelliteDish, Lu.LuSatellite, Pi.PiPlanetBold, Gi.GiSatelliteCommunication],
  shield: [Lu.LuShieldCheck, Pi.PiTrafficSignalBold, Ri.RiShieldCheckLine, Tb.TbShieldCheck],
  flask: [Lu.LuTelescope, Pi.PiFlaskBold, Ri.RiFlaskLine, Tb.TbMicroscope],
  book: [Lu.LuBookOpen, Pi.PiBookOpenTextBold, Ri.RiBookOpenLine, Tb.TbSchool],
  leaf: [Lu.LuSprout, Pi.PiLeafBold, Ri.RiPlantLine, Tb.TbLeaf],
  mountain: [Lu.LuMountain, Pi.PiMountainsBold, Gi.GiMountains, Tb.TbMountain],
  snow: [Lu.LuSnowflake, Pi.PiSnowflakeBold, Ri.RiSnowyLine, Gi.GiIceberg],
  radar: [Lu.LuRadar, Pi.PiMagnifyingGlassBold, Ri.RiRadarLine, Tb.TbRadar2],
  alert: [Lu.LuBell, Pi.PiBellRingingBold, Ri.RiAlarmWarningLine, Tb.TbAlertTriangle],
  fingerprint: [Lu.LuFingerprint, Pi.PiFingerprintBold, Ri.RiFingerprint2Line, Tb.TbFingerprint],
  rocket: [Lu.LuRocket, Pi.PiRocketLaunchBold, Ri.RiRocket2Line, Tb.TbRocket],
  pin: [Lu.LuMapPin, Pi.PiCompassBold, Ri.RiMapPin2Line, Tb.TbMapPin],
  brain: [Lu.LuBrain, Pi.PiBrainBold, Tb.TbBrain, Md.MdOutlineAutoAwesome],
};
const POS = [
  { right: -34, bottom: -38 }, { left: -40, bottom: -34 }, { right: -44, top: -36 }, { left: -34, top: -40 }, { right: -58, top: '18%' }, { left: -56, top: '24%' },
];
let n = 0;
export default function Ghost({ k = 'water', i, size = 150, tone, pos }) {
  const idx = i ?? n++;
  const set = G[k] || G.water, Ic = set[idx % set.length] || set[0], p = POS[(pos ?? idx) % POS.length];
  return (
    <motion.span className="ghost" aria-hidden="true" style={{ ...p, width: size, height: size, color: tone }}
      animate={{ y: [0, -7, 0], rotate: [(idx % 2 ? 8 : -10), (idx % 2 ? 14 : -4), (idx % 2 ? 8 : -10)] }} transition={{ duration: 9 + (idx % 4) * 2, repeat: Infinity, ease: 'easeInOut' }}>
      <Ic size={size} />
    </motion.span>
  );
}
