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

          buildPhase = ''
            runHook preBuild
            npx --no-install astro build
            runHook postBuild
          '';

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
