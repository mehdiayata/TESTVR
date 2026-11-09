export async function setupVr({ renderer, button, status, unlockAudio, startAudio }) {
  if (!('xr' in navigator)) {
    status.textContent = 'WebXR n’est pas disponible dans ce navigateur.';
    return;
  }

  try {
    const supported = await navigator.xr.isSessionSupported('immersive-vr');
    if (!supported) {
      status.textContent = 'Le mode VR immersif n’est pas disponible sur cet appareil.';
      return;
    }

    button.disabled = false;
    status.textContent = 'Le terrain est prêt. Joystick gauche pour marcher, préhension droite pour courir. Y ouvre les réglages du jeu.';

    button.addEventListener('click', async () => {
      try {
        unlockAudio();
        const session = await navigator.xr.requestSession('immersive-vr', {
          requiredFeatures: ['local-floor'],
          optionalFeatures: ['bounded-floor'],
        });
        renderer.xr.enabled = true;
        await renderer.xr.setSession(session);
        startAudio();
        status.textContent = 'Joystick gauche : déplacement ; préhension droite : course ; préhension gauche (majeur) : saut. Y : réglages. Une gâchette principale saisit la balle. Pour dunker, courez avec le ballon puis sautez près du panier et gardez-le en main jusqu’au sommet.';
      } catch (error) {
        console.error('Impossible de démarrer la session WebXR.', error);
        status.textContent = 'Impossible de démarrer la session VR.';
      }
    });
  } catch (error) {
    console.error('Impossible de vérifier le support WebXR.', error);
    status.textContent = 'La vérification de WebXR a échoué.';
  }
}
