export {};
declare global {
  interface Window {
    zyon?: {
      getUpdate: () => Promise<any>;
      updateAction: (action: 'check'|'download'|'install') => Promise<any>;
      onUpdate: (callback: (state: any) => void) => () => void;
      getCatalog: () => Promise<any>;
      refreshCatalog: (force?: boolean) => Promise<any>;
      chooseBuild: (id: string) => Promise<boolean>;
      chooseComp: (id: string) => Promise<boolean>;
      onBuild: (callback: (change: {id:string;revision:number;comp?:any}) => void) => () => void;
      getState: () => Promise<any>;
      editPlan: (action: any) => Promise<any>;
      commitPlan: (comp: any) => Promise<any>;
      onPlan: (callback: (change: any) => void) => () => void;
      getSocial: () => Promise<any>;
      socialAction: (action: any) => Promise<any>;
      onSocial: (callback: (state: any) => void) => () => void;
      onSocialOpen: (callback: () => void) => () => void;
      getFixture: () => Promise<any>;
      publish: (state: any) => Promise<any>;
      gameAction: (action: {
        type: string;
        compId: string | null;
        delta?: number;
        id?: string;
        value?: string | boolean;
      }) => Promise<any>;
      setOverlay: (enabled: boolean) => Promise<boolean>;
      setReader: (enabled: boolean) => Promise<boolean>;
      displays: () => Promise<any[]>;
      captureCalibration: () => Promise<any>;
      minimize: () => void;
      close: () => void;
      onState: (callback: (state: any) => void) => () => void;
      onGame: (callback: (state: any) => void) => () => void;
      onShop: (callback: (state: any) => void) => () => void;
      onDetection: (callback: (data: any) => void) => () => void;
      onOverlay: (callback: (enabled: boolean) => void) => () => void;
      onReader: (callback: (enabled: boolean) => void) => () => void;
    };
  }
}
