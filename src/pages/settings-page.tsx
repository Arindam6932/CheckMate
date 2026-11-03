import { Link } from 'react-router-dom';
import { ArrowLeft, Moon, Palette, Settings, Sparkles, Sun, Volume2, VolumeX } from 'lucide-react';
import { usePreferences, type Appearance } from '../context/preferences-context';

const boardThemes = [
  ['classic','Classic'],['walnut','Walnut'],['marble','Carrara marble'],['emerald','Emerald'],['slate','Slate'],
  ['sakura','Sakura'],['ocean','Ocean'],['neon','Neon'],['ivory','Ivory'],['carbon','Carbon'],
];
const pieceSets = [
  ['classic','Classic'],['minimal','Minimal'],['royal','Royal gold'],['outline','Outline'],['neon','Neon'],
  ['marble','Marble'],['mono','Monochrome'],['wood','Wood'],['glass','Glass'],['fantasy','Fantasy'],
];

export default function SettingsPage() {
  const { appearance, setAppearance, boardTheme, setBoardTheme, pieceSet, setPieceSet, soundEnabled, setSoundEnabled, animationsEnabled, setAnimationsEnabled } = usePreferences();
  return <main className="settings-screen">
    <header className="settings-header"><Link to="/" className="online-back"><ArrowLeft size={16}/> CHECKMATE</Link><span className="online-eyebrow">PLAYER PREFERENCES</span></header>
    <section className="settings-content">
      <div className="settings-title"><div className="settings-title-icon"><Settings size={21}/></div><div><span className="online-eyebrow">MAKE IT YOURS</span><h1>Settings</h1><p>Your preferences are saved on this device.</p></div></div>
      <section className="settings-card"><div className="settings-section-heading"><div><Sun size={17}/><b>App appearance</b></div><small>Choose how CHECKMATE looks</small></div><div className="appearance-options">
        {([{value:'dark',label:'Dark',icon:<Moon size={17}/>},{value:'light',label:'Light',icon:<Sun size={17}/>},{value:'system',label:'System',icon:<Sparkles size={17}/>} ] as const).map(option=><button key={option.value} className={appearance===option.value?'appearance-choice selected':'appearance-choice'} onClick={()=>setAppearance(option.value as Appearance)}>{option.icon}<b>{option.label}</b><span>{appearance===option.value?'Selected':' '}</span></button>)}
      </div></section>
      <section className="settings-card"><div className="settings-section-heading"><div><Palette size={17}/><b>Board appearance</b></div><small>Board and pieces can be mixed independently</small></div><label className="settings-select-label">BOARD THEME<select value={boardTheme} onChange={e=>setBoardTheme(e.target.value)}>{boardThemes.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><div className={`settings-board-preview board-${boardTheme}`}>{Array.from({length:16},(_,i)=><span key={i} className={i%2===0?'light-square':'dark-square'}/>)}</div><label className="settings-select-label">PIECE SET<select value={pieceSet} onChange={e=>setPieceSet(e.target.value)}>{pieceSets.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><div className={`settings-piece-preview piece-set-${pieceSet}`}><span className="piece white-piece">♔</span><span className="piece white-piece">♕</span><span className="piece black-piece">♚</span><span className="piece black-piece">♛</span></div></section>
      <section className="settings-card"><div className="settings-section-heading"><div><Volume2 size={17}/><b>Experience</b></div><small>Control optional interface effects</small></div><button className="settings-toggle" onClick={()=>setSoundEnabled(!soundEnabled)}><span>{soundEnabled?<Volume2 size={17}/>:<VolumeX size={17}/>}<b>Interface sounds</b><small>Sound feedback when supported</small></span><i className={soundEnabled?'toggle-on':'toggle-off'}/></button><button className="settings-toggle" onClick={()=>setAnimationsEnabled(!animationsEnabled)}><span><Sparkles size={17}/><b>Animations</b><small>Transitions and interface motion</small></span><i className={animationsEnabled?'toggle-on':'toggle-off'}/></button></section>
      <p className="settings-note">Board styles, piece styles, appearance, and experience settings are stored locally. They do not affect your opponents’ boards.</p>
    </section>
  </main>;
}
