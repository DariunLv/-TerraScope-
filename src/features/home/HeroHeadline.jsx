import { memo, useEffect, useMemo, useState } from 'react';
import TechText from '../../components/reactbits/TechText/TechText';
const AnimatedText = memo(TechText);
export default memo(function HeroHeadline({ first, second, lang }) {
  const rows = useMemo(() => {
    const words = (first + ' ' + second).toUpperCase().split(' '), cap = Math.ceil(words.join(' ').length / 3) + 1, result = [''];
    words.forEach(word => { const current = result.at(-1); if (current && (current + ' ' + word).length > cap && result.length < 3) result.push(word); else result[result.length - 1] = current ? current + ' ' + word : word; });
    return result;
  }, [first, second]);
  const [step, setStep] = useState(1);
  useEffect(() => { setStep(1); const firstTimer = setTimeout(() => setStep(2), 3600), secondTimer = setTimeout(() => setStep(3), 7200); return () => { clearTimeout(firstTimer); clearTimeout(secondTimer); }; }, [lang]);
  return <h1 key={lang} className="display techh" aria-label={first + ' ' + second} style={{ textTransform: 'uppercase' }}>
    {rows.map((row,index) => <div key={index} className="tt" aria-hidden="true">{step > index && <AnimatedText text={row} fontFamily="Plus Jakarta Sans Variable, Inter Variable, sans-serif" fontWeight={800} fontSize={120} letterSpacing={-0.02} color={index === rows.length - 1 ? '#5eead4' : '#ffffff'} accentColor={index === rows.length - 1 ? '#ffffff' : '#5eead4'} align="left" reach={120} labels={false} guides={false} sweep={false} intro="type" introDuration={2.6} specks={6} speed={0.6} clickKick={false} />}</div>)}
  </h1>;
});
