declare module 'piexifjs' {
  interface ExifValues {
    [key: number]: string | number | number[] | [number, number][] | [
      [number, number], [number, number], [number, number]
    ];
  }

  interface GPSValues {
    [key: number]: string | number | number[] | [number, number][] | [
      [number, number], [number, number], [number, number]
    ];
  }

  interface ExifObj {
    '0th'?: ExifValues;
    'Exif'?: ExifValues;
    'GPS'?: GPSValues;
    '1st'?: ExifValues;
    'thumbnail'?: string;
    'thumbnailx'?: string;
  }

  interface PiexifModule {
    Exif: {
      TAGs: {
        '0th': Record<string, number>;
        'Exif': Record<string, number>;
        'GPS': Record<string, number>;
        '1st': Record<string, number>;
      };
    };
    load(data: string): ExifObj;
    dump(exifObj: ExifObj): string;
    insert(exifStr: string, jpeg: string): string;
    remove(jpeg: string): string;
    VERSION: string;
  }

  const piexif: PiexifModule;
  export default piexif;
}

declare module 'piexif' {
  interface ExifValues {
    [key: number]: string | number | number[] | [number, number][] | [
      [number, number], [number, number], [number, number]
    ];
  }

  interface GPSValues {
    [key: number]: string | number | number[] | [number, number][] | [
      [number, number], [number, number], [number, number]
    ];
  }

  interface ExifObj {
    '0th'?: ExifValues;
    'Exif'?: ExifValues;
    'GPS'?: GPSValues;
    '1st'?: ExifValues;
    'thumbnail'?: string;
    'thumbnailx'?: string;
  }

  interface PiexifModule {
    Exif: {
      TAGs: {
        '0th': Record<string, number>;
        'Exif': Record<string, number>;
        'GPS': Record<string, number>;
        '1st': Record<string, number>;
      };
    };
    load(data: string): ExifObj;
    dump(exifObj: ExifObj): string;
    insert(exifStr: string, jpeg: string): string;
    remove(jpeg: string): string;
    VERSION: string;
  }

  const piexif: PiexifModule;
  export default piexif;
}
