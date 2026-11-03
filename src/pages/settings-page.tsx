import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import {
  ArrowLeft, Check, ChevronRight, CircleHelp, Contrast, Crown, Eye, Gamepad2, Headphones,
  LayoutGrid, Monitor, Moon, Palette, RotateCcw, Sparkles, Sun, Volume2,
  VolumeX, WandSparkles, ImagePlus, Trash2
} from 'lucide-react';
import { usePreferences, type Appearance, type BackgroundStyle } from '../context/preferences-context';
import { useAuth } from '../context/auth-context';

const boardThemes = [
  ['classic','Classic','#e9e8d9','#56866c'],['walnut','Walnut','#dfc29b','#82583d'],
  ['marble','Marble','#f4f3ee','#888e8a'],['emerald','Emerald','#d9e8c9','#327b58'],
  ['slate','Slate','#cbd1d6','#596773'],['sakura','Sakura','#f8e5e8','#c78398'],
  ['ocean','Ocean','#d9eaf0','#4e829a'],['neon','Neon','#c5e8dd','#273c58'],
  ['ivory','Ivory','#f0e8d4','#b5a27b'],['carbon','Carbon','#aeb4b0','#454c49'],
] as const;
const pieceSets = [
  ['classic','Classic'],['minimal','Minimal'],['royal','Royal gold'],['outline','Outline'],
  ['neon','Neon'],['marble','Marble'],['mono','Monochrome'],['wood','Wood'],
  ['glass','Glass'],['fantasy','Fantasy'],
] as const;
const accents = [
  ['Jade','#75d6a1'],['Gold','#d4b36a'],['Ocean','#62a9d8'],['Violet','#aa91e8'],
  ['Rose','#df8fae'],['Amber','#e5a45c'],['Ice','#8bcbd2'],['Ruby','#db7777'],
] as const;
const backgrounds: {value:BackgroundStyle;label:string;description:string}[] = [
  {value:'aurora',label:'Aurora',description:'Soft emerald glow'},
  {value:'midnight',label:'Midnight',description:'Deep graphite'},
  {value:'forest',label:'Forest',description:'Dark green atmosphere'},
  {value:'plain',label:'Minimal',description:'Clean, flat surface'},
];

export default function SettingsPage() {
  const p = usePreferences();
  const { user } = useAuth();
  const [backgroundError, setBackgroundError] = useState('');
  const presets = [
    {name:'Jade room',apply:()=>{p.setAppearance('dark');p.setAccentColor('#75d6a1');p.setBackgroundStyle('aurora');p.setBoardTheme('emerald');p.setPieceSet('classic');p.setCustomBoardColors(false);}},
    {name:'Royal club',apply:()=>{p.setAppearance('dark');p.setAccentColor('#d4b36a');p.setBackgroundStyle('midnight');p.setBoardTheme('walnut');p.setPieceSet('royal');p.setCustomBoardColors(false);}},
    {name:'Ocean glass',apply:()=>{p.setAppearance('dark');p.setAccentColor('#62a9d8');p.setBackgroundStyle('midnight');p.setBoardTheme('ocean');p.setPieceSet('glass');p.setCustomBoardColors(false);}},
    {name:'Sakura',apply:()=>{p.setAppearance('light');p.setAccentColor('#c78398');p.setBackgroundStyle('plain');p.setBoardTheme('sakura');p.setPieceSet('fantasy');p.setCustomBoardColors(false);}},
    {name:'Carbon',apply:()=>{p.setAppearance('dark');p.setAccentColor('#aeb4b0');p.setBackgroundStyle('forest');p.setBoardTheme('carbon');p.setPieceSet('mono');p.setCustomBoardColors(false);}},
  ];
  const toggle = (label:string,description:string,checked:boolean,onChange:(value:boolean)=>void,icon:ReactNode) =>
    <button type="button" className="studio-toggle" onClick={()=>onChange(!checked)}><span className="studio-toggle-icon">{icon}</span><span className="studio-toggle-copy"><b>{label}</b><small>{description}</small></span><i className={checked?'toggle-on':'toggle-off'}>{checked&&<Check size={11}/>}</i></button>;

  return <main className="settings-screen studio-settings">
    <header className="settings-header"><Link to="/" className="online-back"><ArrowLeft size={16}/> CHECKMATE</Link><span className="online-eyebrow">PLAYER CONTROL CENTRE</span></header>
    <section className="settings-content">
      <div className="settings-title"><div className="settings-title-icon"><WandSparkles size={21}/></div><div><span className="online-eyebrow">YOUR BOARD. YOUR RULES.</span><h1>Personalise CHECKMATE</h1><p>Fine-tune your board and playing experience. Signed-in changes sync to your CHECKMATE account.</p></div></div>

      <div className={p.syncStatus==='error'?'settings-sync-banner sync-error':'settings-sync-banner'}>
        <span className={'sync-indicator sync-'+p.syncStatus}/>
        <div><b>{p.syncStatus==='loading'?'Loading account settings':p.syncStatus==='saving'?'Syncing your settings':p.syncStatus==='error'?'Cloud sync unavailable':p.syncStatus==='signed-out'?'Sign in to save your settings':'Settings synced to your account'}</b><small>{user ? 'Your preferences are stored in Firebase and follow your account.' : 'Settings are not saved for guest sessions. Sign in to enable account sync.'}</small></div>
        {!user&&<Link to="/auth?mode=login">Sign in</Link>}
      </div>
      <nav className="settings-category-nav" aria-label="Settings categories"><a href="#app-settings">App settings</a><a href="#appearance">Appearance</a><a href="#gameplay">Gameplay</a><a href="#board">Board & pieces</a><a href="#sound">Sound & motion</a></nav>

      <section className="studio-card" id="app-settings">
        <div className="studio-heading"><div><Monitor size={17}/><b>App settings</b></div><small>Set the overall interface density and behaviour</small></div>
        {toggle('Compact app layout','Use tighter spacing in supported app screens',p.compactMode,p.setCompactMode,<LayoutGrid size={16}/>)}
      </section>

      <section className="studio-card">
        <div className="studio-heading"><div><Sparkles size={17}/><b>One-tap style presets</b></div><small>Start with a complete look, then customise every detail</small></div>
        <div className="studio-presets">{presets.map(preset=><button key={preset.name} onClick={preset.apply} className="studio-preset"><span className={'preset-art preset-'+preset.name.toLowerCase().replace(' ','-')}/><b>{preset.name}</b><ChevronRight size={13}/></button>)}</div>
      </section>

      <section className="studio-card" id="appearance">
        <div className="studio-heading"><div><Monitor size={17}/><b>App appearance</b></div><small>Choose your global theme and accent</small></div>
        <div className="studio-choice-row">{([{value:'dark',label:'Dark',icon:<Moon size={18}/>},{value:'light',label:'Light',icon:<Sun size={18}/>},{value:'system',label:'System',icon:<Monitor size={18}/>} ] as const).map(option=><button key={option.value} className={p.appearance===option.value?'studio-choice active':'studio-choice'} onClick={()=>p.setAppearance(option.value as Appearance)}>{option.icon}<b>{option.label}</b>{p.appearance===option.value&&<Check size={13}/>}</button>)}</div>
        <div className="studio-subheading"><b>Accent colour</b><small>Buttons, highlights and active states</small></div>
        <div className="accent-options">{accents.map(([label,color])=><button key={label} title={label} aria-label={label+' accent'} className={p.accentColor.toLowerCase()===color.toLowerCase()?'accent-swatch selected':'accent-swatch'} style={{'--swatch':color} as CSSProperties & {'--swatch': string}} onClick={()=>p.setAccentColor(color)}>{p.accentColor.toLowerCase()===color.toLowerCase()&&<Check size={14}/>}</button>)}<label className="custom-color"><input type="color" value={p.accentColor} onChange={e=>p.setAccentColor(e.target.value)}/><span>Custom</span></label></div>
        <div className="studio-subheading"><b>Background atmosphere</b><small>Change the mood behind your panels</small></div>
        <div className="background-options">{backgrounds.map(item=><button key={item.value} onClick={()=>p.setBackgroundStyle(item.value)} className={p.backgroundStyle===item.value?'background-choice active':'background-choice'}><span className={'background-art background-art-'+item.value}/><b>{item.label}</b><small>{item.description}</small></button>)}</div>
        <div className="studio-subheading"><b>Your own background image</b><small>Upload a JPG, PNG or WebP image (up to 5 MB). Stored securely in your account.</small></div>
        <div className="custom-background-panel">
          {p.customBackground ? <div className="custom-background-preview" style={{backgroundImage:`url("${p.customBackground}")`}}><span>Custom image active</span></div> : <div className="custom-background-empty"><ImagePlus size={22}/><b>Make CHECKMATE yours</b><small>Choose an image from your device</small></div>}
          <div className="custom-background-actions">
            <label className="custom-background-upload"><ImagePlus size={14}/> {p.customBackground?'Change image':'Upload image'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={!user||p.syncStatus==='saving'} onChange={async e=>{const input=e.currentTarget;const file=input.files?.[0];input.value='';if(!file)return;setBackgroundError('');try{await p.uploadCustomBackground(file);}catch(error){setBackgroundError(error instanceof Error?error.message:'Image upload failed. Please retry.');}}}/></label>
            {p.customBackground&&<button type="button" className="custom-background-remove" disabled={!user||p.syncStatus==='saving'} onClick={async()=>{setBackgroundError('');try{await p.removeCustomBackground();}catch(error){setBackgroundError(error instanceof Error?error.message:'Could not remove the image.');}}}><Trash2 size={13}/> Remove image</button>}
          </div>
          {backgroundError&&<p className="custom-background-error" role="alert">{backgroundError}</p>}
        </div>
      </section>

      <section className="studio-card" id="board">
        <div className="studio-heading"><div><LayoutGrid size={17}/><b>Board studio</b></div><small>Ten ready-made palettes plus your own exact colours</small></div>
        <div className="board-theme-grid">{boardThemes.map(([value,label,light,dark])=><button key={value} onClick={()=>{p.setBoardTheme(value);p.setCustomBoardColors(false);}} className={p.boardTheme===value&&!p.customBoardColors?'board-theme-choice active':''}><span className="mini-board"><i style={{background:light}}/><i style={{background:dark}}/><i style={{background:dark}}/><i style={{background:light}}/></span><b>{label}</b>{p.boardTheme===value&&!p.customBoardColors&&<Check size={12}/>}</button>)}</div>
        <div className="studio-subheading"><b>Custom square colours</b><small>Override the selected board palette</small></div>
        {toggle('Use my own board colours','Choose exact light and dark square colours',p.customBoardColors,p.setCustomBoardColors,<Palette size={16}/>)}
        {p.customBoardColors&&<div className="board-colour-editors"><label><span>LIGHT SQUARE</span><input type="color" value={p.boardLightColor} onChange={e=>p.setBoardLightColor(e.target.value)}/><code>{p.boardLightColor.toUpperCase()}</code></label><label><span>DARK SQUARE</span><input type="color" value={p.boardDarkColor} onChange={e=>p.setBoardDarkColor(e.target.value)}/><code>{p.boardDarkColor.toUpperCase()}</code></label><button onClick={()=>{p.setBoardLightColor('#e9e8d9');p.setBoardDarkColor('#56866c');}}>Reset colours</button></div>}
        <div className="studio-subheading"><b>Live board preview</b><small>Updates as you change the options</small></div>
        <div className={`studio-live-board ${p.customBoardColors?'custom-board-preview':'board-'+p.boardTheme}`} style={{'--board-light':p.boardLightColor,'--board-dark':p.boardDarkColor,'--board-radius':p.boardCorners+'px'} as React.CSSProperties}>{Array.from({length:64},(_,i)=><span key={i} className={(Math.floor(i/8)+i%8)%2===0?'light-square':'dark-square'}/>)}</div>
        <div className="studio-slider"><label htmlFor="board-corners">Board corner roundness <b>{p.boardCorners}px</b></label><input id="board-corners" type="range" min="0" max="24" value={p.boardCorners} onChange={e=>p.setBoardCorners(Number(e.target.value))}/></div>
        <div className="studio-slider"><label htmlFor="piece-scale">Piece size <b>{p.pieceScale}%</b></label><input id="piece-scale" type="range" min="80" max="120" value={p.pieceScale} onChange={e=>p.setPieceScale(Number(e.target.value))}/></div>
      </section>

      <section className="studio-card" id="pieces">
        <div className="studio-heading"><div><Contrast size={17}/><b>Piece collection</b></div><small>Choose a piece finish independently of the board</small></div>
        <div className="piece-set-grid">{pieceSets.map(([value,label])=><button key={value} className={p.pieceSet===value?'piece-set-choice active':'piece-set-choice'} onClick={()=>p.setPieceSet(value)}><span className={'piece-set-preview piece-set-'+value}><i className="piece white-piece">♘</i><i className="piece black-piece">♞</i></span><b>{label}</b>{p.pieceSet===value&&<Check size={12}/>}</button>)}</div>
      </section>

      <section className="studio-card" id="gameplay">
        <div className="studio-heading"><div><Gamepad2 size={17}/><b>Board and gameplay controls</b></div><small>Reduce visual clutter or keep every hint visible</small></div>
        {toggle('Board coordinates','Show file letters and rank numbers',p.showCoordinates,p.setShowCoordinates,<Eye size={16}/>)}
        {toggle('Legal move hints','Show available destination squares after selecting a piece',p.showLegalMoves,p.setShowLegalMoves,<CircleHelp size={16}/>)}
        {toggle('Last move highlight','Highlight the previous move on boards that support it',p.highlightLastMove,p.setHighlightLastMove,<Sparkles size={16}/>)}
        {toggle('Automatic queen promotion','On the homepage practice board, choose a queen without opening the piece picker',p.autoQueen,p.setAutoQueen,<Crown size={16}/>)}
        {toggle('High-contrast board','Increase square and move-marker contrast for visibility',p.highContrast,p.setHighContrast,<Eye size={16}/>)}
        <div className="studio-subheading"><b>Default board orientation</b><small>Homepage practice board: which side should appear at the bottom?</small></div>
        <div className="orientation-options"><button className={p.boardOrientation==='white'?'active':''} onClick={()=>p.setBoardOrientation('white')}>♙ White at bottom</button><button className={p.boardOrientation==='black'?'active':''} onClick={()=>p.setBoardOrientation('black')}>♟ Black at bottom</button></div>
        {toggle('Show move list by default','Open the notation panel when the homepage loads',p.showMoveList,p.setShowMoveList,<LayoutGrid size={16}/>)}
      </section>

      <section className="studio-card" id="sound">
        <div className="studio-heading"><div><Headphones size={17}/><b>Sound and motion</b></div><small>Control supported interface feedback and transitions</small></div>
        {toggle('Interface sounds','Enable sound effects where available',p.soundEnabled,p.setSoundEnabled,p.soundEnabled?<Volume2 size={16}/>:<VolumeX size={16}/>)}
        <div className="studio-slider"><label htmlFor="sound-volume">Sound volume <b>{p.soundVolume}%</b></label><input id="sound-volume" type="range" min="0" max="100" value={p.soundVolume} disabled={!p.soundEnabled} onChange={e=>p.setSoundVolume(Number(e.target.value))}/></div>
        {toggle('Interface animations','Enable transitions and motion effects',p.animationsEnabled,p.setAnimationsEnabled,<Sparkles size={16}/>)}
        <div className="studio-slider"><label htmlFor="animation-speed">Animation speed <b>{p.animationSpeed}%</b></label><input id="animation-speed" type="range" min="50" max="150" step="10" value={p.animationSpeed} disabled={!p.animationsEnabled} onChange={e=>p.setAnimationSpeed(Number(e.target.value))}/><small>Lower is slower and more relaxed; higher is faster.</small></div>
      </section>

      <div className="studio-footer-actions"><p>Preferences sync to your signed-in account. Board and appearance settings only affect your own experience.</p><button disabled={!user||p.syncStatus==='saving'} onClick={()=>{void p.resetPreferences().catch(error=>setBackgroundError(error instanceof Error?error.message:'Could not reset settings.'));}}><RotateCcw size={14}/> Reset every setting</button></div>
    </section>
  </main>;
}
