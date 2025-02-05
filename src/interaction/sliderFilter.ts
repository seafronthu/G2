import { deepMix, throttle } from '@antv/util';
import { isTranspose } from '../utils/coordinate';
import { invert, domainOf } from '../utils/scale';

export const SLIDER_CLASS_NAME = 'slider';

function filterDataByDomain(options, scaleOptions) {
  const { marks } = options;
  const newMarks = marks.map((mark) =>
    deepMix(
      {
        // Hide label to keep smooth transition.
        axis: {
          x: { transform: [{ type: 'hide' }] },
          y: { transform: [{ type: 'hide' }] },
        },
      },
      mark,
      {
        scale: scaleOptions,
        // Don't rerender sliders.
        slider: {
          ...(mark.slider.x && { x: { preserve: true } }),
          ...(mark.slider.y && { y: { preserve: true } }),
        },
        animate: false,
      },
    ),
  );

  // Rerender and update view.
  return {
    ...options,
    marks: newMarks,
    clip: true, // Clip shapes out of plot area.
    animate: false,
  };
}

function abstractValue(values, scale, reverse) {
  const [x, x1] = values;
  const v = reverse ? (d) => 1 - d : (d) => d;
  const d0 = invert(scale, v(x), true);
  const d1 = invert(scale, v(x1), false);
  return domainOf(scale, [d0, d1]);
}

/**
 * @todo Support click to reset after fix click and dragend conflict.
 */
export function SliderFilter({
  wait = 50,
  leading = true,
  trailing = false,
}: any) {
  return (context) => {
    const { container, view, options, update } = context;
    const sliders = container.getElementsByClassName(SLIDER_CLASS_NAME);
    if (!sliders.length) return () => {};

    let filtering = false;
    const { scale, coordinate } = view;
    const { x: scaleX, y: scaleY } = scale;
    const transposed = isTranspose(coordinate);

    const channelOf = (orientation) => {
      const channel0 = orientation === 'vertical' ? 'y' : 'x';
      const channel1 = orientation === 'vertical' ? 'x' : 'y';
      if (transposed) return [channel1, channel0];
      return [channel0, channel1];
    };

    const sliderHandler = new Map();

    // Store current domain of x and y scale.
    const channelDomain = {
      x: scaleX.getOptions().domain,
      y: scaleY.getOptions().domain,
    };

    for (const slider of sliders) {
      const { orientation } = slider.attributes;

      const onValueChange = throttle(
        async (event) => {
          const { value: values } = event.detail;
          if (filtering) return;
          filtering = true;

          const [channel0, channel1] = channelOf(orientation);

          // Update domain of the current channel.
          const scale0 = scale[channel0];
          const domain0 = abstractValue(
            values,
            scale0,
            transposed && orientation === 'horizontal',
          );
          channelDomain[channel0] = domain0;

          // Get domain of the other channel.
          const domain1 = channelDomain[channel1];

          // Filter data.
          const newOptions = filterDataByDomain(options, {
            [channel0]: { domain: domain0 },
            [channel1]: { domain: domain1 },
          });
          await update(newOptions);
          filtering = false;
        },
        wait,
        { leading, trailing },
      );

      slider.addEventListener('valuechange', onValueChange);
      sliderHandler.set(slider, onValueChange);
    }

    return () => {
      for (const [slider, handler] of sliderHandler) {
        slider.removeEventListener('valuechange', handler);
      }
    };
  };
}
