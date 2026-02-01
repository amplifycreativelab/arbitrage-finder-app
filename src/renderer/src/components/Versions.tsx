import { useState } from 'react';

function Versions(): React.JSX.Element {
  const [versions] = useState(window.electron.process.versions);

  return (
    <div className="flex items-center gap-4 text-[10px] text-ot-muted-subtle">
      <div className="flex items-center gap-1.5">
        <span className="uppercase tracking-wider font-medium">Electron</span>
        <span className="font-mono text-ot-foreground-secondary">v{versions.electron}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="uppercase tracking-wider font-medium">Chromium</span>
        <span className="font-mono text-ot-foreground-secondary">v{versions.chrome}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="uppercase tracking-wider font-medium">Node</span>
        <span className="font-mono text-ot-foreground-secondary">v{versions.node}</span>
      </div>
    </div>
  );
}

export default Versions;
