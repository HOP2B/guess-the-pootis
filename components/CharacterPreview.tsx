import Image from 'next/image';

interface CharacterPreviewProps {
  skin: string;
  face: string;
  hat: string;
  size?: number;
}

export default function CharacterPreview({ skin, face, hat, size = 120 }: CharacterPreviewProps) {
  const getSkinPath = (skin: string) => {
    if (skin.includes('.')) return `/character/look_skin/${skin}`;
    return `/character/look_skin/${skin}.webp`;
  };

  const getFacePath = (face: string) => `/character/look_face/${face}.webp`;
  const getHatPath = (hat: string) => `/character/look_hat/${hat}.webp`;

  return (
    <div className="character-preview" style={{ width: size, height: size }}>
      <Image
        src={getSkinPath(skin)}
        alt="Character skin"
        className="character-layer"
        width={size}
        height={size}
        priority
      />
      <Image
        src={getFacePath(face)}
        alt="Character face"
        className="character-layer"
        width={size}
        height={size}
        priority
      />
      <Image
        src={getHatPath(hat)}
        alt="Character hat"
        className="character-layer"
        width={size}
        height={size}
        priority
      />
    </div>
  );
}
