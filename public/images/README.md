# Adding real images

Every gradient placeholder in this project (hero backgrounds, competition
thumbnails, gallery photos) is marked with a `// TODO: replace with real
photo` comment right above it.

To swap a placeholder for a real photo:

1. Drop the image file in this folder (e.g. `public/images/art-fantasy-hero.jpg`).
2. In the relevant `data/*.ts` file, replace the gradient string field with the
   image path, e.g. `heroImage: "/images/art-fantasy-hero.jpg"`.
3. In the component, replace the placeholder `<div style={{ background: ... }} />`
   with:
   ```tsx
   import Image from "next/image";
   <Image src={competition.heroImage} alt={competition.name} fill style={{ objectFit: "cover" }} />
   ```
Next.js's <Image> component handles resizing/optimization automatically —
you don't need to manually resize images before uploading, though smaller
source files still mean faster builds.
