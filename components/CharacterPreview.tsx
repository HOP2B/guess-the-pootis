import Image from 'next/image';

interface CharacterPreviewProps {
  skin: string;
  face: string;
  hat: string;
  size?: number;
  width?: number;
  height?: number;
}

export default function CharacterPreview({ skin, face, hat, size = 120, width, height }: CharacterPreviewProps) {
  const actualWidth = width ?? size;
  const actualHeight = height ?? size;
  const getSkinPath = (skin: string) => {
    if (skin.includes('.')) return `/character/look_skin/${skin}`;
    return `/character/look_skin/${skin}.${skin.includes('green') || skin.includes('white') ? 'png' : 'webp'}`;
  };

  const getFacePath = (face: string) => `/character/look_face/${face}.webp`;
  const getHatPath = (hat: string) => `/character/look_hat/${hat}.webp`;

  return (
    <div className="character-preview" style={{ width: actualWidth, height: actualHeight }}>
      <Image
        src={getSkinPath(skin)}
        alt="Character skin"
        className="character-layer"
        width={actualWidth}
        height={actualHeight}
        priority
      />
      <Image
        src={getFacePath(face)}
        alt="Character face"
        className="character-layer"
        width={actualWidth}
        height={actualHeight}
        priority
      />
      <Image
        src={getHatPath(hat)}
        alt="Character hat"
        className="character-layer"
        width={actualWidth}
        height={actualHeight}
        priority
      />
    </div>
  );
}
