"use client";

/**
 * CountryLandmarkLayer.tsx — PropSphere
 *
 * SVG + CSS landmark layer. High-fidelity geometry with explicit 3D depth.
 * Zero per-frame JavaScript — all animation runs on the browser compositor.
 */

import { useEffect, useState } from "react";
import { usePortalWarp } from "./PortalWarpTransition";

const PALETTE = {
  london: "#3b82f6",
  dubai : "#2dd4bf",
  cairo : "#8b5cf6",
} as const;
type Country = keyof typeof PALETTE;
const D = 6000;

export function CountryLandmarkLayer() {
  const { currentCountry } = usePortalWarp();
  const [scene,   setScene]   = useState<Country>(currentCountry as Country);
  const [animKey, setAnimKey] = useState(0);
  const [opacity, setOpacity] = useState(1);

  useEffect(() => {
    if (currentCountry === scene) return;

    // Start fade out in the next tick to avoid cascading render error
    const fadeTimer = setTimeout(() => {
      setOpacity(0);
    }, 0);

    const transitionTimer = setTimeout(() => {
      setScene(currentCountry as Country);
      setAnimKey(k => k + 1);
      setOpacity(1);
    }, 360);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(transitionTimer);
    };
  }, [currentCountry, scene]);

  const col = PALETTE[scene] ?? PALETTE.london;

  return (
    <>
      <LandmarkCSS col={col} />
      <div
        aria-hidden="true"
        style={{
          position: "fixed", inset: 0, zIndex: 1,
          pointerEvents: "none", opacity,
          transition: "opacity 0.36s ease",
        }}
      >
        <svg
          key={animKey}
          viewBox="0 0 1440 900"
          preserveAspectRatio="xMidYMid slice"
          style={{ width: "100%", height: "100%" }}
        >
          {scene === "london" && <LondonScene col={col} />}
          {scene === "dubai"  && <DubaiScene  col={col} />}
          {scene === "cairo"  && <CairoScene  col={col} />}
        </svg>
      </div>
    </>
  );
}

// ─── Drawing helpers ──────────────────────────────────────────────────────────

const P = (d: string, cls: string, { key, ...rest }: React.SVGProps<SVGPathElement> = {}) => (
  <path key={key} d={d} fill="none" strokeLinecap="round" strokeLinejoin="round"
    strokeDasharray={D} strokeDashoffset={D} className={`lm ${cls}`} {...rest} />
);
const C = (cx:number,cy:number,r:number,cls:string, { key, ...rest }: React.SVGProps<SVGCircleElement> = {}) => (
  <circle key={key} cx={cx} cy={cy} r={r} fill="none"
    strokeDasharray={D} strokeDashoffset={D} className={`lm ${cls}`} {...rest} />
);
const L = (x1:number,y1:number,x2:number,y2:number,cls:string, { key, ...rest }: React.SVGProps<SVGLineElement> = {}) => (
  <line key={key} x1={x1} y1={y1} x2={x2} y2={y2}
    strokeDasharray={D} strokeDashoffset={D} className={`lm ${cls}`} {...rest} />
);

// ═══════════════════════════════════════════════════════════════════════════════
//  LONDON
// ═══════════════════════════════════════════════════════════════════════════════

function LondonScene({ col }: { col: string }) {
  const s2 = { strokeWidth: 2 };
  const s1 = { strokeWidth: 1.2 };
  const s0 = { strokeWidth: 0.7 };

  return (
    <g stroke={col} opacity="0.58">
      <g opacity="0.45">
        {P("M 0 678 C 360 650 720 708 1100 672 C 1280 655 1370 685 1440 672","d0",{...s0})}
        {P("M 0 695 C 390 666 760 724 1140 686 C 1300 668 1385 700 1440 690","d1",{...s0})}
      </g>
      {P("M 0 598 L 553 598",    "d0",{...s1,strokeDasharray:"9 6"})}
      {P("M 887 598 L 1440 598", "d0",{...s1,strokeDasharray:"9 6"})}
      {P("M 580 348 Q 288 576 0 596",     "d2",{...s1})}
      {P("M 860 348 Q 1152 576 1440 596", "d2",{...s1})}
      {P("M 580 348 Q 617 528 720 598",   "d3",{...s0})}
      {P("M 860 348 Q 823 528 720 598",   "d3",{...s0})}
      {[.2,.38,.55,.72,.88].map((t,i)=>{
        const hx=580+(720-580)*t,hy=348+(598-348)*t*t+18;
        return L(hx,hy,hx,598,`d${3+i}`,{...s0,key:`lh${i}`});
      })}
      {[.2,.38,.55,.72,.88].map((t,i)=>{
        const hx=860-(860-720)*t,hy=348+(598-348)*t*t+18;
        return L(hx,hy,hx,598,`d${3+i}`,{...s0,key:`rh${i}`});
      })}
      {P("M 553 598 L 553 385 L 613 385 L 613 598","d4",{...s2})}
      {P("M 553 385 L 583 342 L 613 385",          "d4",{...s2})}
      {P("M 554 372 L 554 385 M 568 368 L 568 385 M 582 364 L 582 385 M 596 368 L 596 385 M 609 372 L 609 385","d5",{...s0})}
      {[420,460,500,540].map((wy,i)=>P(`M 565 ${wy+22} L 565 ${wy+8} Q 583 ${wy} 601 ${wy+8} L 601 ${wy+22}`,`d${5+i}`,{...s0,key:`lw${i}`}))}
      {P("M 827 598 L 827 385 L 887 385 L 887 598","d4",{...s2})}
      {P("M 827 385 L 857 342 L 887 385",          "d4",{...s2})}
      {P("M 828 372 L 828 385 M 842 368 L 842 385 M 856 364 L 856 385 M 870 368 L 870 385 M 884 372 L 884 385","d5",{...s0})}
      {[420,460,500,540].map((wy,i)=>P(`M 838 ${wy+22} L 838 ${wy+8} Q 856 ${wy} 874 ${wy+8} L 874 ${wy+22}`,`d${5+i}`,{...s0,key:`rw${i}`}))}
      {P("M 613 598 L 827 598","d4",{...s2})}
      {P("M 613 452 L 827 452","d5",{...s1})}
      {P("M 613 452 C 650 435 685 435 720 452 C 755 435 790 435 827 452","d6",{...s0})}
      {C(198,428,118,"d0",{...s2})}
      {C(198,428,106,"d1",{...s0})}
      {C(198,428,  6,"d1",{...s1})}
      {[0,45,90,135].map((deg,i)=>{
        const r=deg*Math.PI/180;
        return(
          <g key={i}>
            {L(198+Math.cos(r)*6,428+Math.sin(r)*6,198+Math.cos(r)*106,428+Math.sin(r)*106,`d${2+i}`,{...s0,key:`sa`})}
            {L(198-Math.cos(r)*6,428-Math.sin(r)*6,198-Math.cos(r)*106,428-Math.sin(r)*106,`d${2+i}`,{...s0,key:`sb`})}
          </g>
        );
      })}
      {Array.from({length:16},(_,i)=>{
        const a=(i/16)*Math.PI*2;
        return <ellipse key={i} cx={198+Math.cos(a)*118} cy={428+Math.sin(a)*118}
          rx={6} ry={4} transform={`rotate(${i*22.5} ${198+Math.cos(a)*118} ${428+Math.sin(a)*118})`}
          fill="none" stroke={col} strokeWidth="0.8"
          strokeDasharray={D} strokeDashoffset={D} className="lm d7"/>;
      })}
      {P("M 174 540 L 125 628 M 222 540 L 271 628","d3",{...s1})}
      {P("M 137 604 L 259 604","d4",{...s0})}
      {P("M 1078 598 L 1078 305 L 1128 305 L 1128 598","d0",{...s2})}
      {P("M 1070 347 L 1070 400 L 1136 400 L 1136 347","d2",{...s1})}
      {C(1103,373,22,"d3",{...s1})}
      {P("M 1103 373 L 1103 355","d4",{...s2})}
      {P("M 1103 373 L 1120 366","d4",{...s1})}
      {P("M 1082 305 L 1082 283 L 1124 283 L 1124 305","d1",{...s1})}
      {P("M 1082 283 L 1103 233 L 1124 283","d2",{...s2})}
      {[428,468,508,548].map((wy,i)=>P(`M 1084 ${wy+24} L 1084 ${wy+9} Q 1103 ${wy} 1122 ${wy+9} L 1122 ${wy+24}`,`d${4+i}`,{...s0,key:`bw${i}`}))}
      {P("M 1228 612 L 1216 186","d0",{...s1})}
      {P("M 1216 186 L 1316 568","d1",{...s1})}
      {P("M 1228 612 L 1316 568","d1",{...s0})}
      {[.15,.3,.45,.6,.75,.88].map((t,i)=>{
        const y=186+(612-186)*t,lx=1228-12*t*t,rx=1228+88*(1-t);
        return P(`M ${lx} ${y} L ${rx} ${y}`,`d${5+i}`,{...s0,key:`sh${i}`});
      })}
      <line x1="0" y1="0" x2="1440" y2="0"
        stroke={col} strokeWidth="1.5" opacity="0.18" className="lm-scan"/>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  DUBAI 
// ═══════════════════════════════════════════════════════════════════════════════

function DubaiScene({ col }: { col: string }) {
  const s2   = { strokeWidth: 2.4 };
  const s1   = { strokeWidth: 1.5 };
  const s0   = { strokeWidth: 0.8 };
  const GOLD = "#f59e0b";

  const BK = 490;
  const bkSteps: [number, number][] = [
    [58, 820], [48, 730], [38, 640],
    [29, 540], [21, 440], [14, 340],
    [ 9, 240], [ 5, 160], [ 3, 105],
  ];

  let lPath = `M ${BK - 58} 870`;
  let rPath = `M ${BK + 58} 870`;
  bkSteps.forEach(([hw, topY], i) => {
    const prevHW = i === 0 ? 58 : bkSteps[i-1][0];
    lPath += ` L ${BK - prevHW} ${topY} L ${BK - hw} ${topY}`;
    rPath += ` L ${BK + prevHW} ${topY} L ${BK + hw} ${topY}`;
  });
  lPath += ` L ${BK - 2} 105 L ${BK} 25`;
  rPath += ` L ${BK + 2} 105 L ${BK} 25`;

  const BA  = 1010;
  const BAB = 845;
  const BAT = 170;

  return (
    <g stroke={col} opacity="0.68">
      {P(`M ${BK-58} 870 L ${BK-58} 820 L ${BK+58} 820 L ${BK+58} 870 Z`, "d0", { ...s2 })}
      {P(lPath, "d0", { ...s2 })}
      {P(rPath, "d0", { ...s2 })}
      {P(`M ${BK-58} 870 L ${BK+58} 870`, "d0", { ...s2 })}
      {P(`M ${BK-2} 105 L ${BK} 0`, "d1", { ...s1 })}
      {bkSteps.map(([hw, y], i) => (
        P(`M ${BK - hw} ${y} L ${BK + hw} ${y}`, `d${2+i}`, { ...s0, key: `bkh${i}` })
      ))}
      {[-42, -28, -14, 14, 28, 42].map((dx, i) => (
        P(`M ${BK+dx} 870 L ${BK + Math.sign(dx)*2} 200`,
          `d${5+i}`, { ...s0, key: `bkv${i}`, opacity: "0.3" })
      ))}
      {([540, 340, 148] as number[]).map((y, i) => {
        const hw = (bkSteps.find(s => s[1] <= y) ?? [4, 0])[0];
        return (
          <ellipse key={`od${i}`} cx={BK} cy={y} rx={hw + 12} ry={7}
            fill="none" stroke={GOLD} strokeWidth="2.2"
            strokeDasharray={D} strokeDashoffset={D} className={`lm d${4+i}`}
          />
        );
      })}
      {P(`M ${BA} ${BAB} L ${BA} ${BAT}`, "d0", { ...s2 })}
      {P(`M ${BA} ${BAT} C ${BA+155} 310 ${BA+165} 600 ${BA+138} ${BAB}`, "d1", { ...s2 })}
      {P(`M ${BA} ${BAT} C ${BA-62} 360 ${BA-65} 600 ${BA-42} ${BAB}`, "d1", { ...s1 })}
      {P(`M ${BA-42} ${BAB} L ${BA+138} ${BAB}`, "d1", { ...s1 })}
      {Array.from({length: 10}, (_, i) => {
        const t  = (i + 1) / 11;
        const y  = BAT + (BAB - BAT) * t;
        const lx = BA - 60 * t * (1 - t * 0.3);
        const rx = BA + 155 * t * (1 - t * 0.3);
        return P(`M ${lx} ${y} L ${rx} ${y}`, `d${3+i}`, { ...s0, key: `baf${i}` });
      })}
      {P(`M ${BA} ${BAT} L ${BA + 78} ${BAT - 26}`, "d1", { ...s1 })}
      <ellipse cx={BA+92} cy={BAT-30} rx={32} ry={11}
        fill="none" stroke={col} strokeWidth="1.6"
        strokeDasharray={D} strokeDashoffset={D} className="lm d2"
        transform={`rotate(-18 ${BA+92} ${BAT-30})`}
      />
      {P(`M ${BA+78} ${BAT-36} L ${BA+78} ${BAT-24} M ${BA+78} ${BAT-30} L ${BA+106} ${BAT-30} M ${BA+106} ${BAT-36} L ${BA+106} ${BAT-24}`,
        "d3", { ...s0 })}

      <g opacity="0.58">
        {P("M 82 780 L 82 295 L 145 295 L 145 780",  "d2", { ...s1 })}
        {P("M 255 780 L 255 295 L 318 295 L 318 780", "d2", { ...s1 })}
        {P("M 82 295 L 82 252 L 318 252 L 318 295",  "d3", { ...s1 })}
        {P("M 145 295 L 145 272 L 255 272 L 255 295","d4", { ...s0 })}
        {[340,405,470,535,600,665,730].map((y, i) => (
          <g key={`fr${i}`}>
            {P(`M 82 ${y} L 145 ${y}`,  `d${4+i}`, { ...s0, key: `frl${i}` })}
            {P(`M 255 ${y} L 318 ${y}`, `d${4+i}`, { ...s0, key: `frr${i}` })}
          </g>
        ))}
        {P("M 145 272 L 145 252 L 255 252 L 255 272","d4", { ...s0 })}
        {P("M 200 252 L 200 220", "d5", { ...s1 })}
        {P("M 200 220 L 238 234 L 200 248", "d6", { ...s0 })}
      </g>
      <g opacity="0.22">
        {[[1185,780,68,18],[1225,758,96,20],[1272,778,56,16],[1322,762,84,20],[1368,776,65,17],[1408,766,48,14]].map(([x,bot,h,w],i)=>(
          P(`M ${x-w/2} ${bot} L ${x-w/2} ${bot-h} L ${x+w/2} ${bot-h} L ${x+w/2} ${bot}`,
            `d${i}`,{...s0,key:`sky${i}`})
        ))}
      </g>
      <g stroke={GOLD} opacity="0.28">
        {P("M 0 855 C 420 830 860 868 1300 843 C 1380 838 1418 854 1440 848","d0",{...s0})}
        {P("M 0 871 C 450 846 900 882 1340 857 C 1398 850 1428 869 1440 864","d1",{...s0})}
      </g>
      {Array.from({length:22},(_,i)=>(
        <circle key={`sp${i}`}
          cx={80 + i*62 + (i%5)*16}
          cy={55 + (i%8)*88 + 18}
          r={i%4===0 ? 3 : 1.8}
          fill={GOLD} className={`lm-sparkle lm-s${i%6}`}
        />
      ))}
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CAIRO 
// ═══════════════════════════════════════════════════════════════════════════════

function CairoScene({ col }: { col: string }) {
  const s2   = { strokeWidth: 2.2 };
  const s1   = { strokeWidth: 1.4 };
  const s0   = { strokeWidth: 0.75 };
  const s05  = { strokeWidth: 0.5 };
  const GOLD = "#f59e0b";
  const AMB  = "#d97706";

  return (
    <g stroke={col} opacity="0.62">
      <g opacity="0.38">
        {P("M 0 728 C 340 700 700 752 1100 722 C 1280 708 1370 733 1440 726","d0",{...s1})}
        {P("M 0 748 C 360 720 730 774 1120 740 C 1290 725 1380 750 1440 744","d1",{...s0})}
        {[175, 415, 1055, 1285].map((x,i)=>(
          <g key={`pt${i}`} opacity="0.32">
            {L(x,728,x,682,`d${4+i}`,{strokeWidth:1.5})}
            {[-1,1].map(side=>P(`M ${x} ${692} Q ${x+side*20} ${670} ${x+side*33} ${692}`,`d${5+i}`,{...s05,key:`ptb${i}${side}`}))}
          </g>
        ))}
      </g>

      {P("M 242 715 L 550 142 L 550 715", "d0", { ...s2 })}
      {P("M 242 715 L 550 715",           "d0", { ...s2 })}
      <path d="M 550 142 L 858 715 L 550 715" fill="none"
        stroke={col} strokeWidth="2.2" opacity="0.38"
        strokeDasharray={D} strokeDashoffset={D} className="lm d0"
        strokeLinejoin="round"
      />
      <path d="M 550 142 L 858 715 L 550 715" fill={col} opacity="0.06"/>
      {P("M 550 142 L 550 715", "d0", { ...s0, opacity: "0.55" })}
      {Array.from({length:14},(_,i)=>{
        const t=(i+1)/15, y=142+(715-142)*t, lx=242+(550-242)*t;
        return P(`M ${lx} ${y} L 550 ${y}`,`d${2+i}`,{...s05,key:`kc${i}`});
      })}
      {P("M 540 144 L 550 122 L 560 144", "d2", { stroke: GOLD, strokeWidth: 2.8 })}

      {P("M 656 715 L 880 255",  "d1", { ...s2 })}
      {P("M 880 255 L 1104 715", "d1", { ...s2, opacity: "0.42" })}
      {P("M 656 715 L 1104 715", "d1", { ...s2 })}
      <path d="M 880 255 L 1104 715 L 656 715" fill={col} opacity="0.05"/>
      {P("M 858 264 L 880 234 L 902 264", "d2", { stroke: GOLD, strokeWidth: 3.2 })}
      {Array.from({length:10},(_,i)=>{
        const t=(i+1)/11,y=255+(715-255)*t,lx=656+(880-656)*t;
        return P(`M ${lx} ${y} L 880 ${y}`,`d${3+i}`,{...s05,key:`khc${i}`});
      })}

      {P("M 1062 715 L 1196 388","d2",{...s1})}
      {P("M 1196 388 L 1330 715","d2",{...s1,opacity:"0.42"})}
      {P("M 1062 715 L 1330 715","d2",{...s2})}
      <path d="M 1196 388 L 1330 715 L 1062 715" fill={col} opacity="0.04"/>
      {Array.from({length:7},(_,i)=>{
        const t=(i+1)/8,y=388+(715-388)*t,lx=1062+(1196-1062)*t;
        return P(`M ${lx} ${y} L 1196 ${y}`,`d${4+i}`,{...s05,key:`mec${i}`});
      })}

      {P("M 218 715 L 1370 715","d0",{...s1,opacity:"0.4"})}

      <g stroke={GOLD} opacity="0.85">
        {P("M 40 695 C 55 650 98 640 162 642 C 226 644 272 662 272 695","d0",{...s1})}
        {P("M 40 695 L 272 695","d0",{...s1})}
        {L(218,664,218,695,"d1",{strokeWidth:1.8})}
        {L(256,660,256,695,"d1",{strokeWidth:1.8})}
        {P("M 218 695 L 256 695","d1",{...s1})}
        {P("M 212 650 C 222 635 228 625 238 618","d2",{...s1})}
        {C(252,600,36,"d2",{...s1})}
        {P("M 228 574 L 214 632","d3",{...s0})}
        {P("M 276 574 L 286 630","d3",{...s0})}
        {P("M 226 572 L 278 572","d3",{...s0})}
        {P("M 252 566 L 252 552 Q 260 544 268 552","d4",{...s0})}
        {P("M 268 628 L 276 660","d3",{...s0})}
        {C(238,598,3.5,"d4",{strokeWidth:1.4})}
        {C(266,598,3.5,"d4",{strokeWidth:1.4})}
        {P("M 232 598 L 221 596 M 270 598 L 281 596","d5",{...s05})}
        {P("M 252 608 L 252 618","d5",{...s05})}
      </g>

      <g opacity="0.52">
        {P("M 1280 665 Q 1322 592 1364 665","d3",{...s1})}
        {P("M 1280 665 L 1364 665","d3",{...s0})}
        {P("M 1292 665 L 1292 682 L 1352 682 L 1352 665","d4",{...s0})}
        {P("M 1308 658 Q 1322 640 1336 658","d5",{...s05})}
        {P("M 1385 725 L 1385 528 L 1406 528 L 1406 725","d3",{...s1})}
        {P("M 1378 582 L 1413 582 L 1413 590 L 1378 590 L 1378 582","d4",{...s0})}
        {P("M 1385 528 L 1395 502 L 1406 528","d4",{...s1})}
        {P("M 1388 496 A 8 8 0 0 1 1402 496","d5",{...s1})}
        {P("M 1304 725 L 1304 696 Q 1322 680 1340 696 L 1340 725","d4",{...s0})}
        {P("M 1272 682 Q 1282 662 1292 682","d5",{...s05})}
        {P("M 1352 682 Q 1362 662 1372 682","d5",{...s05})}
      </g>
      {([
        [108,74,0],[250,50,1],[415,86,2],[576,46,0],[738,72,1],
        [892,56,2],[1045,82,0],[1216,50,1],[1395,70,2],
        [185,136,1],[458,120,0],[710,146,2],[966,126,1],[1266,140,0],
        [318,186,2],[586,170,1],[838,193,0],[1118,176,2],
        [142,243,1],[478,226,0],[788,246,2],[1048,230,1],
      ] as [number,number,number][]).map(([x,y,cls],i)=>(
        <g key={`st${i}`}>
          <circle cx={x} cy={y} r={i%5===0?3.2:i%3===0?2.2:1.5}
            fill={col} className={`lm-star lm-star-${cls}`}/>
          {i%4===0&&(
            <g stroke={col} strokeWidth="0.55" className={`lm-star lm-star-${cls}`}>
              <line x1={x-9} y1={y} x2={x+9} y2={y}/>
              <line x1={x} y1={y-9} x2={x} y2={y+9}/>
            </g>
          )}
        </g>
      ))}
      <g strokeWidth="1.1" opacity="0.24">
        {([[75,478],[1388,293],[718,133]] as [number,number][]).map(([x,y],i)=>(
          <g key={`eh${i}`} className={`lm-glyph lm-g${i}`}>
            <ellipse cx={x} cy={y} rx={24} ry={13} fill="none"/>
            <circle  cx={x} cy={y} r={7} fill="none"/>
            <line x1={x+24} y1={y} x2={x+38} y2={y+18}/>
            <line x1={x-24} y1={y} x2={x-36} y2={y+11}/>
            <line x1={x} y1={y-13} x2={x} y2={y-28}/>
            <line x1={x+10} y1={y-9} x2={x+20} y2={y-20}/>
          </g>
        ))}
      </g>
      <g stroke={AMB} opacity="0.2">
        {P("M 0 782 C 180 758 380 800 600 772 C 820 744 1040 790 1280 764 C 1380 754 1420 774 1440 768","d0",{...s05})}
        {P("M 0 800 C 200 776 440 816 680 790 C 900 764 1120 804 1340 780 C 1400 770 1430 790 1440 786","d1",{...s05})}
      </g>
    </g>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  CSS
// ═══════════════════════════════════════════════════════════════════════════════

function LandmarkCSS({ col }: { col: string }) {
  return (
    <style>{`
      @keyframes lm-draw    { to { stroke-dashoffset: 0; } }
      @keyframes lm-scan    { 0%{transform:translateY(0)} 100%{transform:translateY(900px)} }
      @keyframes lm-twinkle { 0%,100%{opacity:.12;transform:scale(.7)} 50%{opacity:.95;transform:scale(1.6)} }
      @keyframes lm-sparkle { 0%,100%{opacity:0} 50%{opacity:.9} }
      @keyframes lm-glyph   { 0%,100%{opacity:.2} 50%{opacity:.42} }

      .lm { filter: drop-shadow(0 0 3px ${col}88); }

      .lm.d0  { animation: lm-draw 2.4s ease            forwards; }
      .lm.d1  { animation: lm-draw 2.4s ease .28s       forwards; }
      .lm.d2  { animation: lm-draw 2.2s ease .55s       forwards; }
      .lm.d3  { animation: lm-draw 2.2s ease .82s       forwards; }
      .lm.d4  { animation: lm-draw 2.0s ease 1.08s      forwards; }
      .lm.d5  { animation: lm-draw 2.0s ease 1.34s      forwards; }
      .lm.d6  { animation: lm-draw 1.8s ease 1.60s      forwards; }
      .lm.d7  { animation: lm-draw 1.6s ease 1.86s      forwards; }
      .lm.d8  { animation: lm-draw 1.4s ease 2.10s      forwards; }
      .lm.d9  { animation: lm-draw 1.2s ease 2.32s      forwards; }
      .lm.d10 { animation: lm-draw 1.1s ease 2.52s      forwards; }
      .lm.d11 { animation: lm-draw 1.0s ease 2.70s      forwards; }
      .lm.d12 { animation: lm-draw 0.9s ease 2.88s      forwards; }
      .lm.d13 { animation: lm-draw 0.8s ease 3.04s      forwards; }

      .lm-scan    { animation: lm-scan 9s linear 3.5s infinite; }
      .lm-sparkle { opacity: 0; }
      .lm-s0 { animation: lm-sparkle 3.2s ease 2.2s infinite; }
      .lm-s1 { animation: lm-sparkle 2.8s ease 2.9s infinite; }
      .lm-s2 { animation: lm-sparkle 3.6s ease 1.6s infinite; }
      .lm-s3 { animation: lm-sparkle 2.5s ease 3.4s infinite; }
      .lm-s4 { animation: lm-sparkle 4.0s ease 0.9s infinite; }
      .lm-s5 { animation: lm-sparkle 3.0s ease 4.2s infinite; }

      .lm-star   { opacity: .15; }
      .lm-star-0 { animation: lm-twinkle 3.4s ease .6s  infinite; }
      .lm-star-1 { animation: lm-twinkle 2.7s ease 1.3s infinite; }
      .lm-star-2 { animation: lm-twinkle 4.2s ease .9s  infinite; }

      .lm-g0 { animation: lm-glyph 6.2s ease .5s  infinite; }
      .lm-g1 { animation: lm-glyph 7.4s ease 2.2s infinite; }
      .lm-g2 { animation: lm-glyph 5.6s ease 4.0s infinite; }
    `}</style>
  );
}
