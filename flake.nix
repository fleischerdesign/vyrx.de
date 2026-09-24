{
  description = "VYRX Enterprise Portal & Landing Page";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
      ...
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        nodejs = pkgs.nodejs_22;
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            git
          ];
        };

        packages.default = pkgs.buildNpmPackage {
          pname = "vyrx-landing";
          version = "1.0.0";

          src = ./.;

          # This value belongs to `package-lock.json` and changes with it. It went stale once, which
          # cost a build: `@types/node` (and its `undici-types`) entered the lock and this line did not
          # follow, so any flake consuming this repository stopped in npmConfigHook with
          # "npmDepsHash is out of date". Whoever touches the lock recomputes this with:
          #   nix run nixpkgs#prefetch-npm-deps -- package-lock.json
          npmDepsHash = "sha256-HjXS+mvrOEt3QFAlqQNQUTk4Aad2AssoudHHPUY9JPE=";

          inherit nodejs;

          # The catalogue is a build input, not a runtime decoration: since S5 one page per service is a
          # prerendered file, so a build that was given no catalogue cannot produce the pages it is
          # asked for. The path comes in through `PORTAL_CATALOGUE` - the interface `src/lib/catalogue.ts`
          # declares for exactly this - which lets whoever generates the catalogue (the fleet's contract
          # projection does) hand it in without the build knowing where it came from. Absent stays
          # absent: the build then renders the honest "no catalogue" state rather than an empty one.
          #
          # TODO(flake): the build inputs of this package are `src` and, when set, the catalogue. A
          # consumer sets it on the derivation, e.g.
          #   (packages.default).overrideAttrs (_: { PORTAL_CATALOGUE = ./portal.json; })

          # The project's own build, not a bare `astro build`: `npm run build` is the pipeline this
          # repository defines - `astro check` and the tests over the i18n tables and the live parts,
          # then the build, then the check that reads the built stylesheet. Running less than that here
          # would ship an artifact the project never verified its own way. Nothing in it needs the
          # network, so it holds in the build sandbox.
          buildPhase = ''
            runHook preBuild
            npm run build
            runHook postBuild
          '';

          # The artifact carries the catalogue it was rendered from, next to the pages rendered from it:
          # the same file the browser fetches at `/portal.json`. Shipping it here is what keeps the
          # prerendered pages and the data the app reads from ever coming from different catalogues.
          installPhase = ''
            runHook preInstall
            mkdir -p $out
            cp -r dist/* $out/
            if [ -n "''${PORTAL_CATALOGUE:-}" ] && [ -f "$PORTAL_CATALOGUE" ]; then
              install -D -m 0644 "$PORTAL_CATALOGUE" "$out/client/portal.json"
            fi
            runHook postInstall
          '';
        };
      }
    );
}
