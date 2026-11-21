# Wishcraft

Wishcraft otvara rođendansku čestitku preko cijelog zaslona čim posjetitelj otvori GitHub Pages stranicu. Ako danas netko slavi, odmah se prikažu njegovo ime i poruka. Kad nema slavljenika, prikazuje se opća čestitka. Pet 3D scena izmjenjuje se svakih 20 sekundi i zatim kreće ispočetka. Scene možeš odabrati i ručno, a uz njih možeš crtati zvjezdanom prašinom, povezivati zvijezde, ugasiti svjećicu, pokrenuti meteore ili ponoviti animaciju. Pauza animacija zaustavlja i izmjenu scena.

## Dodaj jednu osobu

1. U GitHub repozitoriju otvori **Settings → Secrets and variables → Actions → New repository secret**.
2. Daj secretu prvo slobodno ime, primjerice `BIRTHDAY_01`, `BIRTHDAY_02` ili `BIRTHDAY_03`. Podržana su imena do `BIRTHDAY_100`. Redni broj je proizvoljan.
3. U vrijednost zalijepi jedan JSON objekt s imenom, datumom i porukom.

```json
{
  "name": "Izmišljeni primjer",
  "date": "11-21",
  "message": "Sretan rođendan! Želim ti čaroban dan. ✨"
}
```

Datum je u formatu `MM-DD`. Datum `02-29` otvara čestitku 29. veljače u prijestupnoj godini. U poruci možeš koristiti `\n` za novi red. Ako isti dan slavi više osoba, stranica prikazuje prvu čestitku i nudi odabir ostalih.

4. U **Settings → Pages → Build and deployment** odaberi **GitHub Actions**. Za objavu odmah nakon izmjene secreta pokreni **Actions → Deploy Wishcraft to GitHub Pages → Run workflow** s isključenom testnom opcijom. Objavu može pokrenuti i push na `main`. [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
5. Podijeli običnu adresu GitHub Pages stranice.

GitHub Actions čita pojedinačne secrete i objavljuje samo imena i poruke za današnji datum u `today.json`. Zakazane objave su u 00:03 i 00:23 po zagrebačkom vremenu. Stranica mijenja nebo i uklanja jučerašnju čestitku u ponoć. Opća čestitka je vidljiva dok GitHub Pages ne objavi nove podatke. GitHub može odgoditi zakazani workflow ili ga isključiti nakon 60 dana neaktivnosti javnog repozitorija, pa postoji i ručno pokretanje. [Zakazani GitHub Actions workflowi](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

## Isprobaj s testnim podacima

Uz Node.js 22.9 ili noviji pokreni `npm ci` pa `npm run dev` i otvori `http://127.0.0.1:4173/`. Kada nema lokalnih secreta, build odabire jednu izmišljenu čestitku i postavlja je na današnji datum. Za lokalni test uz postojeći `.env` pokreni `npm run build:test` pa `npm run preview`. Za unos vlastitih podataka lokalno koristi [.env.example](.env.example) kao predložak i spremi podatke u ignoriranu datoteku `.env`.

Za testnu objavu na GitHub Pages odaberi **Publish a fictional card for today** pri ručnom pokretanju workflowa. Za provjeru odabira datuma i sadržaja objave pokreni `npm test`.

## Privatnost

Današnja imena i poruke javno su vidljivi svakome tko otvori stranicu. Datoteka objavljena tog dana može se kopirati ili predmemorirati. Zapisi za ostale datume ostaju u GitHub Secrets. [GitHub Actions secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)

## Opening artwork

The built-in ImageGen tool created the [celestial envelope](site/assets/celestial-envelope.webp). Three.js renders the live sky and personalized reveal.

<details>
<summary>Image generation prompt</summary>

Create a single polished landscape web app feature artwork, wide 3:2. Premium tactile CGI product photograph for a magical birthday-card app. Background is nearly black midnight plum (#170e25 at the center, #150d20 at edges), subtly vignetted, filled with many tiny warm peach and pink cosmic dust flecks. Main subject: a beautiful large three-dimensional CLOSED envelope in bright blush and deep magenta metallic origami paper, with clearly visible triangle seams and a circular embossed little wax seal with a four-point star, floating in outer space. Place the envelope visually centered at 50% width and 47% height, about 40% image width, its left corner slightly lower than the right corner, rolled counterclockwise about 12 degrees with slight 3/4 perspective, crisp sculpted folds. Fine beautiful thin elliptical glowing golden-pink orbital paths swing diagonally around the envelope like rings around a planet, a few peach gold glint starbursts and a large pink faceted star on the right, one small metallic lilac orb at bottom left and fine pink grain. Dramatic soft peach light from near top left, photoreal patina, exceptional silhouette, refined color contrast and high detail. Composition must be dark enough for UI over it, with extra breathing room at bottom and top. Edge-to-edge artwork. No text, no type, no UI, no logos, no border, no watermark.

</details>
