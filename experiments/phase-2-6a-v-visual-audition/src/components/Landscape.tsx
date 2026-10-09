import { useId } from 'react'

// Original colored contour geometry. Separate sky/range/water planes span the
// preview rather than stretching one banner across a tall mobile document.
export function Landscape() {
  const id = useId()
  return (
    <div className="landscape-scene landscape-sketch" data-testid="full-page-landscape">
      <div className="sketch-sky-wash" />
      <svg
        className="sketch-sky"
        viewBox="0 0 1000 600"
        preserveAspectRatio="xMidYMin slice"
        aria-hidden="true"
      >
        <g className="landscape-stars" fill="var(--land-light)">
          {Array.from({ length: 20 }, (_, i) => (
            <circle
              key={i}
              cx={25 + ((i * 137) % 950)}
              cy={20 + ((i * 31) % 320)}
              r={i % 6 === 0 ? 1.3 : 0.8}
            />
          ))}
        </g>
        <g className="sketch-clouds landscape-clouds" fill="var(--land-cloud)" stroke="var(--land-line)">
          <path d="M30 123C85 105 121 107 155 118C165 78 218 74 247 104C279 90 311 104 338 124C264 136 95 141 30 123Z" />
          <path d="M597 180C631 159 658 160 684 166C708 132 751 132 779 154C812 146 843 158 874 182C794 190 673 190 597 180Z" />
          <path className="cloud-detail" fill="none" d="M74 145Q182 155 290 144M649 202Q727 210 828 199" />
        </g>
      </svg>
      <div className="sketch-orb landscape-orb" />
      <svg
        className="sketch-ranges"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${id}-range`} x2="0" y2="1">
            <stop stopColor="var(--land-mountain-far)" stopOpacity=".2" />
            <stop offset="1" stopColor="var(--land-mountain-far)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="sketch-range far-range" fill={`url(#${id}-range)`} stroke="var(--land-mountain-far)">
          <path d="M-80 389L89 252L180 294L321 138L405 244L476 207L568 316L699 195L818 293L926 155L1057 287L1280 180V600H-80Z" />
          <path fill="none" d="M321 138L307 240L354 268M699 195L683 269L724 287M926 155L911 235L958 259" />
        </g>
        <g className="sketch-range mid-range" fill={`url(#${id}-range)`} stroke="var(--land-line)">
          <path d="M-90 466L82 370L206 411L390 242L501 368L587 332L711 438L876 286L975 391L1061 355L1280 450V600H-90Z" />
          <path
            fill="none"
            d="M390 242L356 344L405 373L429 414M390 242L417 310L476 346M876 286L835 358L866 385L821 453M876 286L904 342L943 365"
          />
        </g>
        <g className="sketch-range near-range" fill="none" stroke="var(--land-mountain-near)">
          <path d="M-30 535Q119 458 260 496T545 512Q681 472 809 512T1220 491" />
          <path d="M-20 560Q156 502 302 535M586 546Q777 501 980 537T1250 524" />
        </g>
      </svg>
      <div className="sketch-water-wash" />
      <svg className="sketch-water" viewBox="0 0 1200 500" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-water-light`} x2="0" y2="1">
            <stop stopColor="var(--land-light)" stopOpacity=".15" />
            <stop offset="1" stopColor="var(--land-light)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path fill={`url(#${id}-water-light)`} d="M768 0H802L940 500H630Z" />
        <g className="landscape-reflections sketch-reflections" fill="none" stroke="var(--land-line)">
          <path d="M40 12L179 65L390 154L509 84M674 34L789 106L876 187L958 76L1180 119" />
          <path d="M70 46L179 93L333 164M696 63L788 143L876 222L934 139" />
        </g>
        <g className="landscape-ripples sketch-ripples" fill="none" stroke="var(--land-light)">
          <path d="M0 17Q297 6 600 19T1200 15M25 64Q247 48 455 66M657 61Q885 47 1170 65M42 152Q243 133 494 154M574 142Q812 125 1194 149M10 293Q230 270 462 293M524 278Q838 259 1190 280M55 423Q335 397 535 420M699 402Q987 385 1224 402" />
          <path d="M718 83H846M678 111H883M727 194H831M644 242H904M705 347H854" />
        </g>
      </svg>
      <span className="lighting-cue landscape-sky-cue" data-cue-target="sky" />
      <span className="lighting-cue water-cue" data-cue-target="water" />
    </div>
  )
}
