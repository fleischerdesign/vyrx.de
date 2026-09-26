{
  description = "VYRX portal (vyrx.de) — the application, its build and its dev shell";

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
        # Node 24: the LTS line this project targets. It also carries `node:sqlite` without a flag,
        # which the portal's own store uses (see `docs/06-entscheidungen.md`, E-0009).
        nodejs = pkgs.nodejs_24;
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            nodejs
            git
          ];
        };

        packages.default = pkgs.buildNpmPackage {
          pname = "vyrx-portal";
          version = "2.0.0";

          src = ./.;

          # Belongs to `package-lock.json` and changes with it. Recompute with:
          #   nix run nixpkgs#prefetch-npm-deps -- package-lock.json
          npmDepsHash = "sha256-faw3RROZLlyz7kqcyZ0xDHj5uhVFXXPWrA4556EEfBY=";

          inherit nodejs;

          # The project's own pipeline, not a bare `astro build`: `npm run build` is
          # `astro check` + build + the contrast check over the built stylesheet + the tests.
          # Nothing in it needs the network, so it holds in the build sandbox.
          #
          # There is no catalogue build input anymore: the fleet projection is read **at runtime**
          # (`PORTAL_FLEET`), because built is not rolled out and a projection baked into the
          # artifact could disagree with the revision actually running. See `docs/08-ziel-rewrite.md` §6.
          buildPhase = ''
            runHook preBuild
            npm run build
            runHook postBuild
          '';

          # `dist/` carries both halves of one build: `client/` with the pages and assets,
          # `server/` with the Node entry that answers the routes. One build, so a page and the
          # endpoint it calls cannot come from different revisions.
          installPhase = ''
            runHook preInstall
            mkdir -p $out
            cp -r dist/* $out/
            runHook postInstall
          '';
        };
      }
    );
}
